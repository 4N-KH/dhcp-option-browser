import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from '@/infrastructure/database/csp/ip-space-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';

import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';

@Injectable()
export class CspIpSpaceImportService {
  private readonly logger = new Logger(CspIpSpaceImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(IpSpaceDhcpOption)
    private readonly ipSpaceDhcpOptionRepo: Repository<IpSpaceDhcpOption>,
    @InjectRepository(IpSpaceOptionGroup)
    private readonly ipSpaceOptionGroupRepo: Repository<IpSpaceOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
  ) {}

  async importIpSpaces(): Promise<IpSpace[]> {
    this.logger.log(
      'Importing IP Spaces and their DHCP options/groups from CSP...',
    );
    const rawIpSpaces = await this.cspDataClient.fetchIpSpaces();

    if (!Array.isArray(rawIpSpaces) || rawIpSpaces.length === 0) {
      this.logger.warn('No IP Spaces found.');
      return [];
    }

    // Prepare lookup maps
    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

    // Prepare OptionGroup map (by externalId, name, id)
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of await this.optionGroupRepo.find()) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    const importedSpaces: IpSpace[] = [];

    for (const dto of rawIpSpaces) {
      // Upsert IpSpace by externalId
      let entity = await this.ipSpaceRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!entity) {
        entity = this.ipSpaceRepo.create({ externalId: dto.id });
      }
      entity.name = dto.name;
      entity.comment = dto.comment ?? null;

      // Save to ensure .id is set
      entity = await this.ipSpaceRepo.save(entity);
      if (!entity.id) {
        this.logger.error(
          `Critical error: No ID returned after save for IpSpace with externalId=${dto.id}. Skipping import.`,
        );
        continue;
      }

      // Delete old DHCP options (idempotent)
      await this.ipSpaceDhcpOptionRepo.delete({ ipSpaceId: entity.id });

      // Nur echte Optionen importieren (type !== 'group')
      const normalizedOptions = normalizeDhcpOptions(
        dto.dhcp_options ?? [],
      ).filter((opt) => opt.type !== 'group');
      if (normalizedOptions.length > 0) {
        const dhcpOptionEntities = normalizedOptions.map((opt) =>
          this.ipSpaceDhcpOptionRepo.create({
            ipSpaceId: entity.id,
            ...mapDhcpOptionToEntity<IpSpaceDhcpOption>(opt, optionCodeMap),
          }),
        );
        await this.ipSpaceDhcpOptionRepo.save(dhcpOptionEntities);
      }

      // Delete old OptionGroup relations
      await this.ipSpaceOptionGroupRepo.delete({ ipSpaceId: entity.id });

      // OptionGroups aus ALLEN dhcp_options extrahieren
      const foundGroups = resolveOptionGroupsFromOptions(
        dto.dhcp_options ?? [],
        optionGroupMap,
        null,
      );
      if (foundGroups.length > 0) {
        const joins = foundGroups.map((optionGroup) =>
          this.ipSpaceOptionGroupRepo.create({
            ipSpaceId: entity.id,
            optionGroupId: optionGroup.id,
          }),
        );
        await this.ipSpaceOptionGroupRepo.save(joins);
      }

      importedSpaces.push(entity);
    }

    this.logger.log(
      `Import complete: ${importedSpaces.length} IP Spaces with DHCP options and option groups have been saved.`,
    );
    return importedSpaces;
  }
}
