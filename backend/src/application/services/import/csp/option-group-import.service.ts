import { Injectable, Logger } from '@nestjs/common';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspOptionGroupDto } from '@/domain/dto/csp/option-group.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

/**
 * Service for importing Option Groups from CSP.
 * - Fetches all Option Groups via CspDataClient
 * - Logs all DHCP options contained in each Option Group
 */
@Injectable()
export class CspOptionGroupImportService {
  private readonly logger = new Logger(CspOptionGroupImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Imports all Option Groups and logs all options contained in each group.
   */
  async importOptionGroups(): Promise<CspOptionGroupDto[]> {
    this.logger.log('Starting import of CSP Option Groups...');
    const rawGroups = await this.cspDataClient.fetchOptionGroups();

    if (!rawGroups || rawGroups.length === 0) {
      this.logger.warn('No Option Groups found.');
      return [];
    }

    // Normalisiere die DHCP Options für alle Gruppen
    const groups: CspOptionGroupDto[] = rawGroups.map(group => ({
      ...group,
      dhcp_options: normalizeDhcpOptions(group.dhcp_options),
    }));

    let totalOptions = 0;
    for (const group of groups) {
      if (group.dhcp_options && group.dhcp_options.length > 0) {
        totalOptions += group.dhcp_options.length;
      }
    }

    this.logger.log(
      `Fetched ${groups.length} Option Groups from CSP (${totalOptions} DHCP options in total).`,
    );
    // Optional: Log ein Beispiel
    // this.logger.debug(JSON.stringify(groups[0], null, 2));

    return groups;
  }
}
