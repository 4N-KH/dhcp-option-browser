import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { RangeDhcpOption } from '@/infrastructure/database/csp/range-dhcp-option.entity';
import { RangeExclusion } from '@/infrastructure/database/csp/range-exclusion.entity';
import { RangeOptionGroup } from '@/infrastructure/database/csp/range-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';
import type { CspRangeDto } from '@/domain/dto/csp/range.dto';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspRangeImportService {
  private readonly logger = new Logger(CspRangeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(RangeDhcpOption)
    private readonly dhcpOptionRepo: Repository<RangeDhcpOption>,
    @InjectRepository(RangeExclusion)
    private readonly exclusionRepo: Repository<RangeExclusion>,
    @InjectRepository(RangeOptionGroup)
    private readonly rangeOptionGroupRepo: Repository<RangeOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  // Imports all ranges including OptionGroups, DHCP options and exclusions
  async importRanges(opts?: InterruptibleImportOptions): Promise<Range[]> {
    this.logger.log('Importing Ranges from CSP...');
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('Range import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const dtos: CspRangeDto[] = await this.cspDataClient.fetchRanges();

    if (!dtos?.length) {
      this.logger.warn('No Ranges found in CSP.');
      return [];
    }

    const total = dtos.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    // Load lookups
    checkCancel();
    const [subnets, allOptionGroups, optionCodes] = await Promise.all([
      this.subnetRepo.find(),
      this.optionGroupRepo.find(),
      this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    ]);
    const subnetMap = new Map(subnets.map((s) => [s.externalId, s]));
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      const m = og.externalId
        ?.trim()
        .toLowerCase()
        .match(/^dhcp\/option_group\/(.+)$/);
      if (m) optionGroupMap.set(m[1], og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }
    const optionCodeMap = buildOptionCodeMap(optionCodes);

    const importedRanges: Range[] = [];

    for (const dto of dtos) {
      checkCancel();

      const parentSubnet = dto.parent ? subnetMap.get(dto.parent) : undefined;
      if (!parentSubnet) {
        this.logger.warn(
          `No parent subnet found for Range ${dto.id} (parent: ${dto.parent}). Skipping.`,
        );
        progress++;
        report();
        continue;
      }

      let range = await this.rangeRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'exclusionRanges', 'optionGroups'],
      });
      if (!range) range = this.rangeRepo.create({ externalId: dto.id });

      range.name = this.encodingSanitizer.sanitize(dto.name ?? '');
      range.start = this.encodingSanitizer.sanitize(dto.start ?? '');
      range.end = this.encodingSanitizer.sanitize(dto.end ?? '');
      range.comment = dto.comment
        ? this.encodingSanitizer.sanitize(dto.comment)
        : null;
      range.subnet = parentSubnet;
      range.subnetId = parentSubnet.id;

      await this.rangeRepo.save(range);

      // DHCP options
      await this.dhcpOptionRepo.delete({ rangeId: range.id });
      if (Array.isArray(dto.dhcp_options) && dto.dhcp_options.length > 0) {
        const validOptions = dto.dhcp_options.filter(
          (
            opt,
          ): opt is {
            group?: string | null;
            option_code: string;
            option_value: string;
            type: string;
          } =>
            !!opt &&
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string' &&
            opt.type !== 'group',
        );
        const dhcpOptionEntities = validOptions.map((opt) =>
          this.dhcpOptionRepo.create({
            ...mapDhcpOptionToEntity<RangeDhcpOption>(opt, optionCodeMap),
            range,
            rangeId: range.id,
          }),
        );
        if (dhcpOptionEntities.length > 0)
          await this.dhcpOptionRepo.save(dhcpOptionEntities);
      }

      // OptionGroups
      await this.rangeOptionGroupRepo.delete({ rangeId: range.id });
      let groupKeys = Array.isArray(dto.dhcp_options)
        ? dto.dhcp_options
            .map((opt) =>
              typeof opt.group === 'string'
                ? opt.group.trim().toLowerCase()
                : null,
            )
            .filter((g): g is string => !!g)
        : [];
      groupKeys = Array.from(new Set(groupKeys));

      const foundGroups = resolveOptionGroupsFromOptions(
        dto.dhcp_options,
        optionGroupMap,
        null,
      );
      for (const optionGroup of foundGroups) {
        await this.rangeOptionGroupRepo.save(
          this.rangeOptionGroupRepo.create({
            range,
            rangeId: range.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          }),
        );
      }
      if (foundGroups.length === 0 && groupKeys.length > 0) {
        this.logger.warn(
          `[NO_MATCH] Range '${range.start} - ${range.end}' (ID=${range.id}) - no OptionGroups found for: ${groupKeys.join(', ')}`,
        );
      }

      // Exclusion ranges
      await this.exclusionRepo.delete({ rangeId: range.id });
      if (
        Array.isArray(dto.exclusion_ranges) &&
        dto.exclusion_ranges.length > 0
      ) {
        for (const excl of dto.exclusion_ranges) {
          if (excl.start && excl.end) {
            const exclusion = this.exclusionRepo.create({
              range,
              rangeId: range.id,
              start: this.encodingSanitizer.sanitize(excl.start),
              end: this.encodingSanitizer.sanitize(excl.end),
              comment: excl.comment
                ? this.encodingSanitizer.sanitize(excl.comment)
                : null,
            });
            await this.exclusionRepo.save(exclusion);
          }
        }
      }

      importedRanges.push(range);
      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${importedRanges.length} Ranges (including OptionGroups, DHCP options, and exclusions) saved.`,
    );
    return importedRanges;
  }
}
