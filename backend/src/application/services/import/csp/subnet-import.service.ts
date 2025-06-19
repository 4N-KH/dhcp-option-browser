import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Service for importing DHCP options assigned to Subnets from CSP.
 */
@Injectable()
export class CspSubnetImportService {
  private readonly logger = new Logger(CspSubnetImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all Subnets and persists directly assigned DHCP options.
   */
  async importSubnets(): Promise<void> {
    this.logger.log('Starting import of CSP Subnets...');
    const subnets: CspSubnetDto[] = await this.cspDataClient.fetchSubnets();

    if (!subnets?.length) {
      this.logger.warn('No Subnets found.');
      return;
    }

    let totalOptions = 0;

    for (const subnet of subnets) {
      if (
        Array.isArray(subnet.dhcp_options) &&
        subnet.dhcp_options.length > 0
      ) {
        for (const opt of subnet.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            origin: `${DhcpOptionOrigin.SUBNET}:${subnet.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${subnets.length} Subnets (${totalOptions} options).`,
    );
  }
}
