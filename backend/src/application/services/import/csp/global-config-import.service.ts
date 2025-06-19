import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspGlobalDhcpConfigDto } from '@/domain/dto/csp/global-dhcp-config.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Imports and persists global DHCP options from the CSP API.
 */
@Injectable()
export class CspGlobalConfigImportService {
  private readonly logger = new Logger(CspGlobalConfigImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Fetches global DHCP configuration from CSP and saves all options to DB.
   */
  async importGlobalDhcpConfig(): Promise<void> {
    this.logger.log('Importing global DHCP configuration from CSP...');

    const globalConfig: CspGlobalDhcpConfigDto =
      await this.cspDataClient.fetchGlobalDhcpConfig();

    if (!globalConfig?.dhcp_options?.length) {
      this.logger.warn('No DHCP options found in global configuration.');
      return;
    }

    for (const opt of globalConfig.dhcp_options) {
      // Additional validation, deduplication, transformation can be placed here
      const entity = this.dhcpOptionRepo.create({
        code: Number(opt.option_code),
        value: opt.option_value,
        origin: DhcpOptionOrigin.GLOBAL_DHCP_CONFIG,
      });
      await this.dhcpOptionRepo.save(entity);
    }

    this.logger.log(
      `Imported ${globalConfig.dhcp_options.length} global DHCP options from CSP.`,
    );
  }
}
