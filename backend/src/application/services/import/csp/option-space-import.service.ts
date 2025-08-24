import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';
import type { CspOptionSpaceDto } from '@/domain/dto/csp/option-space.dto';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspOptionSpaceImportService {
  private readonly logger = new Logger(CspOptionSpaceImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  // Imports all Option Spaces from CSP and persists them in the database
  async importOptionSpaces(
    opts?: InterruptibleImportOptions,
  ): Promise<OptionSpace[]> {
    this.logger.log('Commencing import of DHCP Option Spaces from CSP...');
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('OptionSpace import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const spaces: CspOptionSpaceDto[] =
      await this.cspDataClient.fetchOptionSpaces();

    if (!spaces?.length) {
      this.logger.warn('No Option Spaces were received from CSP.');
      return [];
    }

    const importedEntities: OptionSpace[] = [];
    const total = spaces.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of spaces) {
      checkCancel();
      let entity = await this.optionSpaceRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionSpaceRepo.create({ externalId: dto.id });
      }
      entity.name = this.encodingSanitizer.sanitize(dto.name ?? '');
      entity.comment = dto.comment
        ? this.encodingSanitizer.sanitize(dto.comment)
        : null;
      entity.protocol = dto.protocol ?? null;
      entity.createdAt = dto.created_at ?? null;
      entity.updatedAt = dto.updated_at ?? null;

      await this.optionSpaceRepo.save(entity);
      importedEntities.push(entity);

      progress++;
      report();
    }
    this.logger.log(
      `Import complete: ${importedEntities.length} Option Spaces have been saved.`,
    );
    return importedEntities;
  }
}
