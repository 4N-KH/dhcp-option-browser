import { Injectable, Logger } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspRangeDto } from '@/domain/dto/csp/range.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Service for importing DHCP options assigned to Ranges from CSP.
 */
@Injectable()
export class CspRangeImportService {
  private readonly logger = new Logger(CspRangeImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Imports all Ranges and logs directly assigned DHCP options.
   */
  async importRanges(): Promise<CspRangeDto[]> {
    this.logger.log('Starting import of CSP Ranges...');
    const rawRanges = await this.cspDataClient.fetchRanges();

    if (!rawRanges?.length) {
      this.logger.warn('No Ranges found.');
      return [];
    }

    // Normalisiere dhcp_options bei jedem Range
    const ranges: CspRangeDto[] = rawRanges.map((range) => ({
      ...range,
      dhcp_options: normalizeDhcpOptions(range.dhcp_options),
    }));

    let totalOptions = 0;
    for (const range of ranges) {
      if (range.dhcp_options && range.dhcp_options.length > 0) {
        totalOptions += range.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${ranges.length} Ranges from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: this.logger.debug(JSON.stringify(ranges.slice(0, 2), null, 2));

    return ranges;
  }
}
