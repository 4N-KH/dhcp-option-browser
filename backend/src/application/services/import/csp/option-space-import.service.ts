// backend/src/application/services/import/csp/option-space-import.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';

@Injectable()
export class CspOptionSpaceImportService {
  private readonly logger = new Logger(CspOptionSpaceImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
  ) {}

  /**
   * Imports all Option Spaces from CSP and persists them in the database.
   * Updates existing records where applicable.
   */
  async importOptionSpaces(): Promise<OptionSpace[]> {
    this.logger.log('Commencing import of DHCP Option Spaces from CSP...');
    const spaces = await this.cspDataClient.fetchOptionSpaces();

    if (!spaces?.length) {
      this.logger.warn('No Option Spaces were received from CSP.');
      return [];
    }

    const importedEntities: OptionSpace[] = [];
    for (const dto of spaces) {
      let entity = await this.optionSpaceRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionSpaceRepo.create({ externalId: dto.id });
      }
      entity.name = dto.name ?? '';
      entity.comment = dto.comment ?? null;
      entity.protocol = dto.protocol ?? null;
      entity.createdAt = dto.created_at ?? null;
      entity.updatedAt = dto.updated_at ?? null;

      await this.optionSpaceRepo.save(entity);
      importedEntities.push(entity);
    }
    this.logger.log(
      `Import complete: ${importedEntities.length} Option Spaces have been saved.`,
    );
    return importedEntities;
  }
}
