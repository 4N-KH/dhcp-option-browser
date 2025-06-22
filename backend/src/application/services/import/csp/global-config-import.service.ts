import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspGlobalDhcpConfigDto } from '@/domain/dto/csp/global-dhcp-config.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Imports global DHCP options from the CSP API (no DB persistence).
 */
@Injectable()
export class CspGlobalConfigImportService {
  private readonly logger = new Logger(CspGlobalConfigImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Fetches global DHCP configuration from CSP and logs all options.
   */
  async importGlobalDhcpConfig(): Promise<CspGlobalDhcpConfigDto | null> {
    this.logger.log('Importing global DHCP configuration from CSP...');

    const rawGlobalConfig = await this.cspDataClient.fetchGlobalDhcpConfig();

    if (!rawGlobalConfig?.dhcp_options?.length) {
      this.logger.warn('No DHCP options found in global configuration.');
      return null;
    }

    // Typensichere Normalisierung der dhcp_options
    const globalConfig: CspGlobalDhcpConfigDto = {
      ...rawGlobalConfig,
      dhcp_options: normalizeDhcpOptions(rawGlobalConfig.dhcp_options),
    };

    this.logger.log(
      `Fetched ${globalConfig.dhcp_options.length} global DHCP options from CSP.`,
    );
    // Optional: this.logger.debug(JSON.stringify(globalConfig.dhcp_options, null, 2));

    return globalConfig;
  }
}
