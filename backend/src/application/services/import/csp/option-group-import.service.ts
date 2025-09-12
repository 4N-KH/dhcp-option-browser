import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspOptionGroupImportService {
  private readonly logger = new Logger(CspOptionGroupImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  // Imports all Option Groups from CSP and persists/updates them in the database
  async importOptionGroups(
    opts?: InterruptibleImportOptions,
  ): Promise<OptionGroup[]> {
    this.logger.log('Starting import of CSP Option Groups...');
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('OptionGroup import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const groups = await this.cspDataClient.fetchOptionGroups();

    if (!groups?.length) {
      this.logger.warn('No Option Groups found.');
      return [];
    }

    const importedEntities: OptionGroup[] = [];
    const total = groups.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of groups) {
      checkCancel();

      let entity = await this.optionGroupRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionGroupRepo.create({ externalId: dto.id });
      }
      entity.name = this.encodingSanitizer.sanitize(dto.name ?? '');
      entity.comment = dto.comment
        ? this.encodingSanitizer.sanitize(dto.comment)
        : undefined;
      entity.protocol = dto.protocol ?? undefined;

      await this.optionGroupRepo.save(entity);
      importedEntities.push(entity);

      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${importedEntities.length} Option Groups have been saved.`,
    );
    return importedEntities;
  }
}
