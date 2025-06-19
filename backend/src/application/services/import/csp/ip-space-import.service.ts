import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspIpSpaceDto } from '@/domain/dto/csp/ip-space.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Imports DHCP options set directly on IP Spaces from the CSP API.
 */
@Injectable()
export class CspIpSpaceImportService {
  private readonly logger = new Logger(CspIpSpaceImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all IP Spaces and persists directly assigned DHCP options.
   */
  async importIpSpaces(): Promise<void> {
    this.logger.log('Importing IP Spaces and their DHCP options from CSP...');
    const ipSpaces: CspIpSpaceDto[] = await this.cspDataClient.fetchIpSpaces();

    if (!ipSpaces?.length) {
      this.logger.warn('No IP Spaces found.');
      return;
    }

    let totalOptions = 0;

    for (const space of ipSpaces) {
      if (Array.isArray(space.dhcp_options) && space.dhcp_options.length > 0) {
        for (const opt of space.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            // Nutze das Enum + dynamischer Suffix für IP Space
            origin: `${DhcpOptionOrigin.IP_SPACE}:${space.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${ipSpaces.length} IP Spaces (${totalOptions} options).`,
    );
  }
}
