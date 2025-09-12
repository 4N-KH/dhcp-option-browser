import { Injectable, Logger } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspConfigProfileDto } from '@/domain/dto/csp/config-profile.dto';
import { normalizeAndDedupeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

/*
 Service for importing configuration profiles from CSP.
 */
@Injectable()
export class CspConfigProfileImportService {
  private readonly logger = new Logger(CspConfigProfileImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

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

    const rawProfiles: CspConfigProfileDto[] =
      await this.cspDataClient.fetchConfigProfiles();

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
        name: this.encodingSanitizer.sanitize(profile.name ?? ''),
        comment: profile.comment
          ? this.encodingSanitizer.sanitize(profile.comment)
          : undefined,
        dhcp_options: normalizeAndDedupeDhcpOptions(profile.dhcp_options).map(
          (opt) => ({
            ...opt,
            option_value:
              typeof opt.option_value === 'string'
                ? this.encodingSanitizer.sanitize(opt.option_value)
                : opt.option_value,
          }),
        ),
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

    return profiles;
  }
}
