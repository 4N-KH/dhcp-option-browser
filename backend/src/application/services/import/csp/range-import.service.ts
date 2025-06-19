import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspRangeDto } from '@/domain/dto/csp/range.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Service for importing DHCP options assigned to Ranges from CSP.
 */
@Injectable()
export class CspRangeImportService {
  private readonly logger = new Logger(CspRangeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all Ranges and persists directly assigned DHCP options.
   */
  async importRanges(): Promise<void> {
    this.logger.log('Starting import of CSP Ranges...');
    const ranges: CspRangeDto[] = await this.cspDataClient.fetchRanges();

    if (!ranges?.length) {
      this.logger.warn('No Ranges found.');
      return;
    }

    let totalOptions = 0;

    for (const range of ranges) {
      if (Array.isArray(range.dhcp_options) && range.dhcp_options.length > 0) {
        for (const opt of range.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            origin: `${DhcpOptionOrigin.RANGE}:${range.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${ranges.length} Ranges (${totalOptions} options).`,
    );
  }
}
