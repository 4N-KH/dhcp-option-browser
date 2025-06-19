import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Service for importing DHCP options assigned to Address Blocks from CSP.
 */
@Injectable()
export class CspAddressBlockImportService {
  private readonly logger = new Logger(CspAddressBlockImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all Address Blocks and persists directly assigned DHCP options.
   */
  async importAddressBlocks(): Promise<void> {
    this.logger.log('Starting import of CSP Address Blocks...');
    const blocks: CspAddressBlockDto[] =
      await this.cspDataClient.fetchAddressBlocks();

    if (!blocks?.length) {
      this.logger.warn('No Address Blocks found.');
      return;
    }

    let totalOptions = 0;

    for (const block of blocks) {
      if (Array.isArray(block.dhcp_options) && block.dhcp_options.length > 0) {
        for (const opt of block.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            // Verwende das Origin-Enum mit dynamischer Block-ID
            origin: `${DhcpOptionOrigin.ADDRESS_BLOCK}:${block.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${blocks.length} Address Blocks (${totalOptions} options).`,
    );
  }
}
