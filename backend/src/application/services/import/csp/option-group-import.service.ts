import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspOptionGroupDto } from '@/domain/dto/csp/option-group.dto';
import { DhcpOption } from '@/infrastructure/database/dhcp-option.entity';
import { DhcpOptionOrigin } from '@/domain/enums/csp/dhcp-origin.enum';

/**
 * Service for importing Option Groups from CSP.
 * - Fetches all Option Groups via CspDataClient
 * - Persists all DHCP options contained in each Option Group
 */
@Injectable()
export class CspOptionGroupImportService {
  private readonly logger = new Logger(CspOptionGroupImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpOption)
    private readonly dhcpOptionRepo: Repository<DhcpOption>,
  ) {}

  /**
   * Imports all Option Groups and persists all options contained in each group.
   */
  async importOptionGroups(): Promise<void> {
    this.logger.log('Starting import of CSP Option Groups...');
    const groups: CspOptionGroupDto[] =
      await this.cspDataClient.fetchOptionGroups();

    if (!groups || groups.length === 0) {
      this.logger.warn('No Option Groups found.');
      return;
    }

    let totalOptions = 0;

    for (const group of groups) {
      if (group.dhcp_options && group.dhcp_options.length > 0) {
        for (const opt of group.dhcp_options) {
          const entity = this.dhcpOptionRepo.create({
            code: Number(opt.option_code),
            value: opt.option_value,
            origin: `${DhcpOptionOrigin.OPTION_GROUP}:${group.id}`,
          });
          await this.dhcpOptionRepo.save(entity);
          totalOptions++;
        }
      }
    }

    this.logger.log(
      `Imported DHCP options from ${groups.length} Option Groups (${totalOptions} options).`,
    );
  }
}
