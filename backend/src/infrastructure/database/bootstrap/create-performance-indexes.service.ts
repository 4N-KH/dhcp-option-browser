import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CreatePerformanceIndexesService implements OnModuleInit {
  private readonly logger = new Logger(CreatePerformanceIndexesService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Creates missing performance indexes for all DHCP hierarchies
   * and updates statistics. Runs once on application startup.
   */
  async onModuleInit(): Promise<void> {
    const indexQueries: string[] = [
      // -------- OPTION CODE LOOKUPS --------
      `CREATE INDEX IF NOT EXISTS "idx_option_code_code"       ON "option_code" ("code");`,
      `CREATE INDEX IF NOT EXISTS "idx_option_code_name"       ON "option_code" ("name");`,
      `CREATE INDEX IF NOT EXISTS "idx_option_code_space_code" ON "option_code" ("optionSpaceId","code");`,

      // -------- GLOBAL CONFIG --------
      `CREATE INDEX IF NOT EXISTS "idx_gco_global_code"  ON "dhcp_global_config_option" ("globalConfigId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_gcog_global_group" ON "dhcp_global_config_option_group" ("globalConfigId","optionGroupId");`,

      // -------- IP SPACE --------
      `CREATE INDEX IF NOT EXISTS "idx_ipsdo_space_code" ON "ip_space_dhcp_option" ("ipSpaceId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_ipsog_space_group" ON "ip_space_option_group" ("ipSpaceId","optionGroupId");`,
      `CREATE INDEX IF NOT EXISTS "idx_ip_space_external" ON "ip_space" ("externalId");`,

      // -------- ADDRESS BLOCK --------
      `CREATE INDEX IF NOT EXISTS "idx_ab_parent"         ON "address_block" ("parentId");`,
      `CREATE INDEX IF NOT EXISTS "idx_ab_space"          ON "address_block" ("spaceId");`,
      `CREATE INDEX IF NOT EXISTS "idx_abdo_block_code"   ON "address_block_dhcp_option" ("addressBlockId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_abog_block_group"  ON "address_block_option_group" ("addressBlockId","optionGroupId");`,

      // -------- SUBNET --------
      `CREATE INDEX IF NOT EXISTS "idx_sn_space"          ON "subnet" ("spaceId");`,
      `CREATE INDEX IF NOT EXISTS "idx_sn_block"          ON "subnet" ("addressBlockId");`,
      `CREATE INDEX IF NOT EXISTS "idx_sdo_subnet_code"   ON "subnet_dhcp_option" ("subnetId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_sog_subnet_group"  ON "subnet_option_group" ("subnetId","optionGroupId");`,

      // -------- RANGE --------
      `CREATE INDEX IF NOT EXISTS "idx_rg_subnet"         ON "range" ("subnetId");`,
      `CREATE INDEX IF NOT EXISTS "idx_rdo_range_code"    ON "range_dhcp_option" ("rangeId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_rog_range_group"   ON "range_option_group" ("rangeId","optionGroupId");`,
      `CREATE INDEX IF NOT EXISTS "idx_rx_range"          ON "range_exclusion" ("rangeId");`,

      // -------- FIXED ADDRESS --------
      `CREATE INDEX IF NOT EXISTS "idx_fa_subnet"         ON "fixed_address" ("subnetId");`,
      `CREATE INDEX IF NOT EXISTS "idx_fado_fixed_code"   ON "fixed_dhcp_option" ("fixedAddressId","optionCodeId");`,
      `CREATE INDEX IF NOT EXISTS "idx_faog_fixed_group"  ON "fixed_address_option_group" ("fixedAddressId","optionGroupId");`,

      // -------- OPTION GROUP META --------
      `CREATE INDEX IF NOT EXISTS "idx_og_name"           ON "option_group" ("name");`,
      `CREATE INDEX IF NOT EXISTS "idx_og_external"       ON "option_group" ("externalId");`,
    ];

    const analyzeQueries: string[] = [
      `ANALYZE "option_code";`,
      `ANALYZE "dhcp_global_config_option";`,
      `ANALYZE "dhcp_global_config_option_group";`,
      `ANALYZE "ip_space_dhcp_option";`,
      `ANALYZE "ip_space_option_group";`,
      `ANALYZE "ip_space";`,
      `ANALYZE "address_block";`,
      `ANALYZE "address_block_dhcp_option";`,
      `ANALYZE "address_block_option_group";`,
      `ANALYZE "subnet";`,
      `ANALYZE "subnet_dhcp_option";`,
      `ANALYZE "subnet_option_group";`,
      `ANALYZE "range";`,
      `ANALYZE "range_dhcp_option";`,
      `ANALYZE "range_option_group";`,
      `ANALYZE "range_exclusion";`,
      `ANALYZE "fixed_address";`,
      `ANALYZE "fixed_dhcp_option";`,
      `ANALYZE "fixed_address_option_group";`,
      `ANALYZE "option_group";`,
    ];

    for (const q of indexQueries) {
      try {
        await this.dataSource.query(q);
      } catch (e) {
        this.logger.warn(
          `Index skipped: ${this.preview(q)} -> ${(e as Error).message}`,
        );
      }
    }

    for (const q of analyzeQueries) {
      try {
        await this.dataSource.query(q);
      } catch (e) {
        this.logger.warn(`ANALYZE skipped: ${(e as Error).message}`);
      }
    }

    this.logger.log('Performance indexes ensured across all hierarchy levels.');
  }

  private preview(sql: string): string {
    const line = sql.replace(/\s+/g, ' ').trim();
    return line.length > 120 ? line.slice(0, 120) + '…' : line;
  }
}
