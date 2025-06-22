import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';
import { CspGlobalDhcpConfigDto } from '@/domain/dto/csp/global-dhcp-config.dto';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly cspClient: CspDataClient) {}

  async onModuleInit(): Promise<void> {
    try {
      // 1. Subnets laden und DHCP-Optionen normalisieren
      const rawSubnets = await this.cspClient.fetchSubnets();
      const subnets: CspSubnetDto[] = rawSubnets.map((subnet) => ({
        ...subnet,
        dhcp_options: normalizeDhcpOptions(subnet.dhcp_options),
      }));

      this.logger.log(`Retrieved ${subnets.length} subnets from CSP`);
      this.logger.debug(JSON.stringify(subnets.slice(0, 3), null, 2));

      // 2. Globale DHCP-Konfiguration loggen (inkl. Option Group), normalisiert
      const rawGlobalDhcpConfig = await this.cspClient.fetchGlobalDhcpConfig();
      const globalDhcpConfig: CspGlobalDhcpConfigDto = {
        ...rawGlobalDhcpConfig,
        dhcp_options: normalizeDhcpOptions(rawGlobalDhcpConfig.dhcp_options),
        dhcp_options_v6: rawGlobalDhcpConfig.dhcp_options_v6
          ? normalizeDhcpOptions(rawGlobalDhcpConfig.dhcp_options_v6)
          : [],
      };
      this.logger.log(
        'Global DHCP config from CSP: ' +
          JSON.stringify(globalDhcpConfig, null, 2),
      );

      // 3. Subnetze mit Option Group loggen
      const subnetsWithGroup = subnets.filter((s) => !!s.option_group);
      if (subnetsWithGroup.length > 0) {
        this.logger.log(
          `Found ${subnetsWithGroup.length} subnets with option group.`,
        );
        this.logger.debug(
          'Example (first): ' + JSON.stringify(subnetsWithGroup[0], null, 2),
        );
      } else {
        this.logger.log('No subnets with option group found.');
      }
    } catch (error) {
      this.logger.error('Failed to retrieve CSP data', error);
    }
  }
}
