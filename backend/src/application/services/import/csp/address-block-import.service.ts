import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Service for importing DHCP options assigned to Address Blocks from CSP.
 */
@Injectable()
export class CspAddressBlockImportService {
  private readonly logger = new Logger(CspAddressBlockImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Imports all Address Blocks and logs directly assigned DHCP options.
   */
  async importAddressBlocks(): Promise<CspAddressBlockDto[]> {
    this.logger.log('Starting import of CSP Address Blocks...');
    const rawBlocks = await this.cspDataClient.fetchAddressBlocks();

    if (!rawBlocks?.length) {
      this.logger.warn('No Address Blocks found.');
      return [];
    }

    // **dhcp_options normalisieren, damit Typ passt**
    const blocks = rawBlocks.map((block) => ({
      ...block,
      dhcp_options: normalizeDhcpOptions(block.dhcp_options),
    }));

    let totalOptions = 0;

    for (const block of blocks) {
      if (Array.isArray(block.dhcp_options) && block.dhcp_options.length > 0) {
        totalOptions += block.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${blocks.length} Address Blocks from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(blocks.slice(0, 2), null, 2));

    return blocks;
  }
}
