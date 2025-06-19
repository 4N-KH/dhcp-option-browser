// backend/src/application/import/csp-option-code-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspOptionCodeDto } from '@/domain/dto/csp/option-code.dto';
import { OptionCodeEntity } from '@/infrastructure/database/option-code.entity';

/**
 * Imports all DHCP Option Codes from CSP, stores all metadata fields for later reporting.
 */
@Injectable()
export class CspOptionCodeImportService {
  private readonly logger = new Logger(CspOptionCodeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
  ) {}

  async importOptionCodes(): Promise<void> {
    this.logger.log('Starting import of CSP DHCP Option Codes...');
    const optionCodes: CspOptionCodeDto[] =
      await this.cspDataClient.fetchOptionCodes();

    if (!optionCodes || optionCodes.length === 0) {
      this.logger.warn('No option codes found.');
      return;
    }

    for (const opt of optionCodes) {
      const entity = this.optionCodeRepo.create({
        extId: opt.id,
        code: opt.code,
        name: opt.name,
        type: opt.type,
        optionSpace: opt.option_space,
        comment: opt.comment,
        raw: opt, // Vollständige Kopie für maximale Zukunftssicherheit
      });
      await this.optionCodeRepo.save(entity);
    }

    this.logger.log(
      `Imported ${optionCodes.length} DHCP Option Codes from CSP.`,
    );
  }
}
