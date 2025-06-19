import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspFixedAddressDto } from '@/domain/dto/csp/fixed-address.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Service for importing Fixed Addresses from CSP.
 * - Fetches Fixed Addresses via CspDataClient
 * - Maps and persists DHCP options set directly on each Fixed Address
 */
@Injectable()
export class CspFixedAddressImportService {
  private readonly logger = new Logger(CspFixedAddressImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all Fixed Addresses and persists directly assigned DHCP options.
   */
  async importFixedAddresses(): Promise<void> {
    this.logger.log('Starting import of CSP Fixed Addresses...');
    const fixedAddresses: CspFixedAddressDto[] =
      await this.cspDataClient.fetchFixedAddresses();

    if (!fixedAddresses || fixedAddresses.length === 0) {
      this.logger.warn('No Fixed Addresses found.');
      return;
    }

    let totalOptions = 0;

    for (const fa of fixedAddresses) {
      if (fa.dhcp_options && fa.dhcp_options.length > 0) {
        for (const opt of fa.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            origin: `${DhcpOptionOrigin.FIXED_ADDRESS}:${fa.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${fixedAddresses.length} Fixed Addresses (${totalOptions} options).`,
    );
  }
}
