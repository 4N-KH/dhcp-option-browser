import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspConfigProfileDto } from '@/domain/dto/csp/config-profile.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';

/**
 * Service for importing configuration profiles from CSP.
 * - Fetches config profiles via CspDataClient
 * - Maps and persists relevant DHCP options per profile (minimal example)
 */
@Injectable()
export class CspConfigProfileImportService {
  private readonly logger = new Logger(CspConfigProfileImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Import all CSP configuration profiles and persist included DHCP options.
   */
  async importConfigProfiles(): Promise<void> {
    this.logger.log('Starting import of CSP configuration profiles...');
    const profiles: CspConfigProfileDto[] =
      await this.cspDataClient.fetchConfigProfiles();

    if (!profiles || profiles.length === 0) {
      this.logger.warn('No CSP configuration profiles found.');
      return;
    }

    let totalOptions = 0;

    for (const profile of profiles) {
      if (profile.dhcp_options && profile.dhcp_options.length > 0) {
        for (const opt of profile.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            origin: `CONFIG_PROFILE:${profile.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${profiles.length} config profiles (${totalOptions} options).`,
    );
  }
}
