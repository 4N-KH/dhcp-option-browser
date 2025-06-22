import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspIpSpaceDto } from '@/domain/dto/csp/ip-space.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Imports DHCP options set directly on IP Spaces from the CSP API.
 */
@Injectable()
export class CspIpSpaceImportService {
  private readonly logger = new Logger(CspIpSpaceImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Loads all IP Spaces and logs directly assigned DHCP options.
   */
  async importIpSpaces(): Promise<CspIpSpaceDto[]> {
    this.logger.log('Importing IP Spaces and their DHCP options from CSP...');
    const rawIpSpaces = await this.cspDataClient.fetchIpSpaces();

    if (!rawIpSpaces?.length) {
      this.logger.warn('No IP Spaces found.');
      return [];
    }

    // Normalisiere dhcp_options für jeden Space
    const ipSpaces: CspIpSpaceDto[] = rawIpSpaces.map(space => ({
      ...space,
      dhcp_options: normalizeDhcpOptions(space.dhcp_options),
    }));

    let totalOptions = 0;
    for (const space of ipSpaces) {
      if (space.dhcp_options && space.dhcp_options.length > 0) {
        totalOptions += space.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${ipSpaces.length} IP Spaces from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(ipSpaces[0], null, 2));
    return ipSpaces;
  }
}
