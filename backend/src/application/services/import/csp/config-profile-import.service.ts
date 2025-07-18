import { Injectable, Logger } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspConfigProfileDto } from '@/domain/dto/csp/config-profile.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

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
   * Import all CSP configuration profiles, normalise options, report progress, support interrupt.
   */
  async importConfigProfiles(
    opts?: InterruptibleImportOptions,
  ): Promise<CspConfigProfileDto[]> {
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('Config profile import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    this.logger.log('Starting import of CSP configuration profiles...');
    checkCancel();
    const rawProfiles = await this.cspDataClient.fetchConfigProfiles();

    if (!rawProfiles || rawProfiles.length === 0) {
      this.logger.warn('No CSP configuration profiles found.');
      return [];
    }

    const total = rawProfiles.length;
    let progress = 0;
    const profiles: CspConfigProfileDto[] = [];

    for (const profile of rawProfiles) {
      checkCancel();
      const normalisedProfile: CspConfigProfileDto = {
        ...profile,
        dhcp_options: normalizeDhcpOptions(profile.dhcp_options),
      };
      profiles.push(normalisedProfile);

      progress++;
      opts?.onProgress?.(progress, total);
    }

    const totalOptions = profiles.reduce(
      (sum, p) => sum + (p.dhcp_options?.length || 0),
      0,
    );

    this.logger.log(
      `Fetched ${profiles.length} config profiles from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(profiles.slice(0, 2), null, 2));

    return profiles;
  }
}
