import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from '@/infrastructure/database/csp/ip-space-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

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

    // Prepare lookup maps for option codes and option groups
    const allOptionCodes = await this.optionCodeRepo.find();
    const optionCodeMap = new Map<string, OptionCodeEntity>();
    for (const code of allOptionCodes) {
      if (code.externalId) optionCodeMap.set(code.externalId, code);
      if (code.code !== undefined && code.code !== null) {
        optionCodeMap.set(String(code.code), code);
      }
    }

    const allOptionGroups = await this.optionGroupRepo.find();
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (og.externalId) optionGroupMap.set(og.externalId, og);
      if (og.name) optionGroupMap.set(og.name, og);
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
          `Kritischer Fehler: Keine ID nach Save für IpSpace mit externalId=${dto.id} erhalten. Import wird übersprungen.`,
        );
        continue;
      }

      // Lösche alte DHCP-Optionen (idempotent)
      await this.ipSpaceDhcpOptionRepo.delete({ ipSpaceId: entity.id });

      // Normalisiere und speichere neue Optionen
      const normalizedOptions = normalizeDhcpOptions(dto.dhcp_options ?? []);
      const dhcpOptionEntities = normalizedOptions.map((opt) => {
        const codeEntity = optionCodeMap.get(opt.option_code);
        return this.ipSpaceDhcpOptionRepo.create({
          ipSpaceId: entity.id,
          group: opt.group ?? null,
          option_code: opt.option_code,
          option_value: opt.option_value,
          type: opt.type,
          optionCodeId: codeEntity?.id ?? undefined, // undefined, nicht null
        });
      });

      if (dhcpOptionEntities.length > 0) {
        await this.ipSpaceDhcpOptionRepo.save(dhcpOptionEntities);
      }

      // Lösche alte OptionGroup-Relationen
      await this.ipSpaceOptionGroupRepo.delete({ ipSpaceId: entity.id });

      // Sammle eindeutige Gruppen aus den Optionen
      const groupIds = Array.from(
        new Set(
          (normalizedOptions ?? [])
            .map((opt) => opt.group)
            .filter((g): g is string => typeof g === 'string' && !!g),
        ),
      );

      const optionGroupJoins = groupIds
        .map((groupId) => {
          const ogEntity = optionGroupMap.get(groupId);
          if (!ogEntity) {
            this.logger.warn(
              `OptionGroup "${groupId}" nicht gefunden – Zuordnung für IpSpace "${entity.name}" wird übersprungen.`,
            );
            return null;
          }
          return this.ipSpaceOptionGroupRepo.create({
            ipSpaceId: entity.id,
            optionGroupId: ogEntity.id,
          });
        })
        .filter(Boolean);

      if (optionGroupJoins.length > 0) {
        await this.ipSpaceOptionGroupRepo.save(
          optionGroupJoins as IpSpaceOptionGroup[],
        );
      }

      importedSpaces.push(entity);
    }

    this.logger.log(
      `Import complete: ${importedSpaces.length} IP Spaces with DHCP options & option groups have been saved.`,
    );
    return importedSpaces;
  }
}
