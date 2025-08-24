import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from '@/infrastructure/database/csp/ip-space-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';
import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';
import { EncodingSanitizer } from '../transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';
import type { CspIpSpaceDto } from '@/domain/dto/csp/ip-space.dto';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

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
    @Inject(DefaultEncodingSanitizerService)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  async importIpSpaces(opts?: InterruptibleImportOptions): Promise<IpSpace[]> {
    this.logger.log(
      'Importing IP Spaces and their DHCP options/groups from CSP...',
    );

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('IpSpace import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const rawIpSpaces: CspIpSpaceDto[] =
      await this.cspDataClient.fetchIpSpaces();

    if (!Array.isArray(rawIpSpaces) || rawIpSpaces.length === 0) {
      this.logger.warn('No IP Spaces found.');
      return [];
    }

    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of await this.optionGroupRepo.find()) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    const importedSpaces: IpSpace[] = [];
    const total = rawIpSpaces.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of rawIpSpaces) {
      checkCancel();

      // Upsert IpSpace based on externalId
      let entity = await this.ipSpaceRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!entity) {
        entity = this.ipSpaceRepo.create({ externalId: dto.id });
      }
      entity.name = this.encodingSanitizer.sanitize(dto.name ?? '');
      entity.comment = this.encodingSanitizer.sanitize(dto.comment ?? '');

      // Ensure entity is saved before relations
      entity = await this.ipSpaceRepo.save(entity);
      if (!entity.id) {
        this.logger.error(
          `Critical error: No ID returned after save for IpSpace with externalId=${dto.id}. Skipping import.`,
        );
        progress++;
        report();
        continue;
      }

      // Clear old DHCP options for idempotency
      await this.ipSpaceDhcpOptionRepo.delete({ ipSpaceId: entity.id });

      const normalizedOptions = normalizeDhcpOptions(
        dto.dhcp_options ?? [],
      ).filter((opt) => opt.type !== 'group');

      if (normalizedOptions.length > 0) {
        const dhcpOptionEntities = normalizedOptions.map((opt) =>
          this.ipSpaceDhcpOptionRepo.create({
            ipSpaceId: entity.id,
            ...mapDhcpOptionToEntity<IpSpaceDhcpOption>(
              {
                ...opt,
                option_value: this.encodingSanitizer.sanitize(
                  opt.option_value ?? '',
                ),
              },
              optionCodeMap,
            ),
          }),
        );
        await this.ipSpaceDhcpOptionRepo.save(dhcpOptionEntities);
      }

      // Clear old OptionGroup relations
      await this.ipSpaceOptionGroupRepo.delete({ ipSpaceId: entity.id });

      // Resolve OptionGroups and create joins
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

      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${importedSpaces.length} IP Spaces with DHCP options and option groups have been saved.`,
    );
    return importedSpaces;
  }
}
