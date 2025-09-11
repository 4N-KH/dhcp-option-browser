import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionFilter } from '@/infrastructure/database/csp/option-filter.entity';
import { CspOptionFilterDto } from '@/domain/dto/csp/option-filter.dto';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspOptionFilterImportService {
  private readonly logger = new Logger(CspOptionFilterImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionFilter)
    private readonly optionFilterRepo: Repository<OptionFilter>,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  async importOptionFilters(
    opts?: InterruptibleImportOptions,
  ): Promise<OptionFilter[]> {
    this.logger.log('Starting import of Option Filters from CSP...');

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('OptionFilter import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const rawFilters: CspOptionFilterDto[] =
      await this.cspDataClient.fetchOptionFilters();

    if (!rawFilters?.length) {
      this.logger.warn('No Option Filters received from CSP API.');
      return [];
    }

    this.logger.log(
      `[Import] CSP API returned ${rawFilters.length} Option Filters.`,
    );

    const imported: OptionFilter[] = [];
    const skipped: { id: string; name: string; reason: string }[] = [];
    const allReceivedIds: string[] = rawFilters.map((f) => f.id);
    const persistedIds: string[] = [];
    const total = rawFilters.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of rawFilters) {
      checkCancel();

      if (!dto.id || !dto.name) {
        skipped.push({
          id: dto.id || 'UNDEFINED',
          name: dto.name || '',
          reason: 'Missing ID or Name',
        });
        progress++;
        report();
        continue;
      }

      let entity = await this.optionFilterRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionFilterRepo.create({ externalId: dto.id });
      }

      entity.name = this.encodingSanitizer.sanitize(dto.name);
      entity.protocol = dto.protocol ?? undefined;
      entity.role = dto.role ?? undefined;
      entity.comment = this.encodingSanitizer.sanitize(dto.comment ?? null);
      entity.vendorSpecificOptionOptionSpace = this.encodingSanitizer.sanitize(
        dto.vendor_specific_option_option_space ?? null,
      );
      entity.createdAt = dto.created_at ?? undefined;
      entity.updatedAt = dto.updated_at ?? undefined;

      if (Array.isArray(dto.dhcp_options)) {
        entity.dhcpOptions = dto.dhcp_options.filter(
          (opt) =>
            (opt.type === 'option' &&
              typeof opt.option_code === 'string' &&
              typeof opt.option_value === 'string') ||
            (opt.type === 'group' && typeof opt.group === 'string'),
        );
      } else {
        entity.dhcpOptions = undefined;
      }

      if (dto.rules && typeof dto.rules === 'object') {
        entity.rules = {
          match:
            typeof dto.rules.match === 'string'
              ? this.encodingSanitizer.sanitize(dto.rules.match)
              : '',
          rules: Array.isArray(dto.rules.rules)
            ? dto.rules.rules.map((r) => ({
                compare: r.compare,
                option_code: r.option_code,
                option_value: r.option_value,
                substring_offset: r.substring_offset ?? undefined,
              }))
            : [],
        };
      } else {
        entity.rules = undefined;
      }

      await this.optionFilterRepo.save(entity);
      imported.push(entity);
      persistedIds.push(dto.id);

      this.logger.debug(
        `[${dto.id}] Saved: name="${entity.name}", dhcpOptions: ${JSON.stringify(entity.dhcpOptions)}`,
      );

      progress++;
      report();
    }

    if (skipped.length) {
      this.logger.warn(`[Import] ${skipped.length} filters were skipped:`);
      skipped.forEach((f) =>
        this.logger.warn(
          `Skipped: "${f.name}" (${f.id}) - Reason: ${f.reason}`,
        ),
      );
    }

    const missingIds = allReceivedIds.filter(
      (id) => !persistedIds.includes(id),
    );
    if (missingIds.length > 0) {
      this.logger.warn(
        `[Import] ${missingIds.length} received Option Filters were NOT persisted. Missing IDs: ${JSON.stringify(missingIds)}`,
      );
    }

    this.logger.log(
      `Import complete: ${imported.length} Option Filters saved.`,
    );
    return imported;
  }
}
