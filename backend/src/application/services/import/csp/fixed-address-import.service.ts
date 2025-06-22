import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspFixedAddressDto } from '@/domain/dto/csp/fixed-address.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Service for importing Fixed Addresses from CSP.
 * - Fetches Fixed Addresses via CspDataClient
 * - Logs DHCP options set directly on each Fixed Address
 */
@Injectable()
export class CspFixedAddressImportService {
  private readonly logger = new Logger(CspFixedAddressImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Imports all Fixed Addresses and logs directly assigned DHCP options.
   */
  async importFixedAddresses(): Promise<CspFixedAddressDto[]> {
    this.logger.log('Starting import of CSP Fixed Addresses...');
    const rawFixedAddresses = await this.cspDataClient.fetchFixedAddresses();

    if (!rawFixedAddresses || rawFixedAddresses.length === 0) {
      this.logger.warn('No Fixed Addresses found.');
      return [];
    }

    // Normalisieren der dhcp_options für jeden Fixed Address
    const fixedAddresses: CspFixedAddressDto[] = rawFixedAddresses.map((fa) => ({
      ...fa,
      dhcp_options: normalizeDhcpOptions(fa.dhcp_options),
    }));

    let totalOptions = 0;

    for (const fa of fixedAddresses) {
      if (fa.dhcp_options && fa.dhcp_options.length > 0) {
        totalOptions += fa.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${fixedAddresses.length} Fixed Addresses from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(fixedAddresses.slice(0, 2), null, 2));

    return fixedAddresses;
  }
}
