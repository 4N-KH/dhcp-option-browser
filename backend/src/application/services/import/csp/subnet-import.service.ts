import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

/**
 * Service for importing DHCP options assigned to Subnets from CSP.
 */
@Injectable()
export class CspSubnetImportService {
  private readonly logger = new Logger(CspSubnetImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Loads all Subnets from CSP and logs DHCP options.
   */
  async importSubnets(): Promise<CspSubnetDto[]> {
    this.logger.log('Starting import of CSP Subnets...');
    const subnets: CspSubnetDto[] = await this.cspDataClient.fetchSubnets();

    if (!subnets?.length) {
      this.logger.warn('No Subnets found.');
      return [];
    }

    let totalOptions = 0;
    for (const subnet of subnets) {
      if (
        Array.isArray(subnet.dhcp_options) &&
        subnet.dhcp_options.length > 0
      ) {
        totalOptions += subnet.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${subnets.length} Subnets from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: Logging der ersten Einträge
    // this.logger.debug(JSON.stringify(subnets.slice(0, 3), null, 2));
    return subnets;
  }
}
