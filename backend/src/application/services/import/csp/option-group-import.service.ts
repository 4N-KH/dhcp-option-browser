// backend/src/application/services/import/csp/option-group-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

@Injectable()
export class CspOptionGroupImportService {
  private readonly logger = new Logger(CspOptionGroupImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
  ) {}

  /**
   * Imports all Option Groups from CSP and persists/updates them in the database.
   */
  async importOptionGroups(): Promise<OptionGroup[]> {
    this.logger.log('Starting import of CSP Option Groups...');
    const groups = await this.cspDataClient.fetchOptionGroups();

    if (!groups?.length) {
      this.logger.warn('No Option Groups found.');
      return [];
    }

    const importedEntities: OptionGroup[] = [];
    for (const dto of groups) {
      let entity = await this.optionGroupRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionGroupRepo.create({ externalId: dto.id });
      }
      entity.name = dto.name;
      entity.comment = dto.comment ?? undefined;
      entity.protocol = dto.protocol ?? undefined;
      entity.createdAt = dto.created_at ?? undefined;
      entity.updatedAt = dto.updated_at ?? undefined;

      await this.optionGroupRepo.save(entity);
      importedEntities.push(entity);
    }

    this.logger.log(
      `Import complete: ${importedEntities.length} Option Groups have been saved.`,
    );
    return importedEntities;
  }
}
