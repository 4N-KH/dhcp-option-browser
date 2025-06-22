import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspConfigProfileDto } from '@/domain/dto/csp/config-profile.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Service for importing configuration profiles from CSP.
 * - Fetches config profiles via CspDataClient
 * - Logs relevant DHCP options per profile
 */
@Injectable()
export class CspConfigProfileImportService {
  private readonly logger = new Logger(CspConfigProfileImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Import all CSP configuration profiles and log included DHCP options.
   */
  async importConfigProfiles(): Promise<CspConfigProfileDto[]> {
    this.logger.log('Starting import of CSP configuration profiles...');
    const rawProfiles = await this.cspDataClient.fetchConfigProfiles();

    if (!rawProfiles || rawProfiles.length === 0) {
      this.logger.warn('No CSP configuration profiles found.');
      return [];
    }

    // Normalisieren der dhcp_options
    const profiles: CspConfigProfileDto[] = rawProfiles.map((profile) => ({
      ...profile,
      dhcp_options: normalizeDhcpOptions(profile.dhcp_options),
    }));

    let totalOptions = 0;
    for (const profile of profiles) {
      if (profile.dhcp_options && profile.dhcp_options.length > 0) {
        totalOptions += profile.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${profiles.length} config profiles from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(profiles.slice(0, 2), null, 2));

    return profiles;
  }
}
