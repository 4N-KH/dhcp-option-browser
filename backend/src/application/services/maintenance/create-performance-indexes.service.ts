import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CreatePerformanceIndexesService implements OnModuleInit {
  private readonly logger = new Logger(CreatePerformanceIndexesService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Ensuring performance indexes …');

    // --------- Utils (mit sicheren Typen, kein `any`) -----------------------
    const q = (id: string): string => `"${id.replace(/"/g, '""')}"`;

    const runQuery = async <T extends Record<string, unknown>>(
      sql: string,
      params: unknown[] = [],
    ): Promise<T[]> => {
      const resUnknown: unknown = await this.dataSource.query(sql, params);
      if (!Array.isArray(resUnknown)) return [];
      // Wir erwarten eine Array-of-objects-Struktur von pg → schmaler Cast auf Record
      const arr = resUnknown as unknown[];
      const out: T[] = [];
      for (const item of arr) {
        if (item !== null && typeof item === 'object') {
          out.push(item as T);
        }
      }
      return out;
    };

    const tableExists = async (table: string): Promise<boolean> => {
      const rows = await runQuery<{ exists: boolean | null }>(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [`public.${table}`],
      );
      const first = rows[0];
      return first?.exists === true;
    };

    const listColumns = async (table: string): Promise<Set<string>> => {
      const rows = await runQuery<{ column_name: unknown }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1`,
        [table],
      );
      const s = new Set<string>();
      for (const r of rows) {
        if (typeof r.column_name === 'string') s.add(r.column_name);
      }
      return s;
    };

    const resolveExistingColumn = async (
      table: string,
      candidates: string[],
    ): Promise<string | null> => {
      if (!(await tableExists(table))) return null;
      const cols = await listColumns(table);
      for (const c of candidates) {
        if (cols.has(c)) return c;
      }
      return null;
    };

    const ensureIndex = async (args: {
      name: string;
      table: string;
      columns: string[];
      include?: string[];
      where?: string;
      using?: string;
    }): Promise<void> => {
      const { name, table, columns, include, where, using } = args;

      if (!(await tableExists(table))) {
        this.logger.warn(`Skip index ${name}: table ${table} not found`);
        return;
      }
      const cols = await listColumns(table);
      for (const c of columns) {
        if (!cols.has(c)) {
          this.logger.warn(
            `Skip index ${name}: column ${c} not found on ${table}`,
          );
          return;
        }
      }
      if (include) {
        for (const c of include) {
          if (!cols.has(c)) {
            this.logger.warn(
              `Skip index ${name}: INCLUDE column ${c} not found on ${table}`,
            );
            return;
          }
        }
      }

      const colList = columns.map(q).join(',');
      const includeList =
        include && include.length
          ? ` INCLUDE (${include.map(q).join(',')})`
          : '';
      const usingPart = using ? ` USING ${using}` : '';
      const wherePart = where ? ` WHERE ${where}` : '';
      const sql = `CREATE INDEX IF NOT EXISTS ${q(name)} ON ${q(table)}${usingPart} (${colList})${includeList}${wherePart};`;

      try {
        await this.dataSource.query(sql);
        this.logger.debug(`Index OK: ${sql.replace(/\s+/g, ' ').trim()}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Index skipped (${name}): ${msg}`);
      }
    };

    const analyzeIfExists = async (table: string): Promise<void> => {
      if (await tableExists(table)) {
        try {
          await this.dataSource.query(`ANALYZE ${q(table)};`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`ANALYZE skipped for ${table}: ${msg}`);
        }
      }
    };

    // --------- Schemavarianten erkennen ------------------------------------
    const abSpaceCol =
      (await resolveExistingColumn('address_block', ['spaceId', 'space_id'])) ??
      null;

    let fixedOptTable: string | null = null;
    for (const candidate of [
      'fixed_dhcp_option',
      'fixed_address_dhcp_option',
    ]) {
      if (await tableExists(candidate)) {
        fixedOptTable = candidate;
        break;
      }
    }

    // --------- Indizes gemäß Hierarchien -----------------------------------
    // OPTION CODE LOOKUPS
    await ensureIndex({
      name: 'idx_option_code_code',
      table: 'option_code',
      columns: ['code'],
    });
    await ensureIndex({
      name: 'idx_option_code_name',
      table: 'option_code',
      columns: ['name'],
    });
    await ensureIndex({
      name: 'idx_option_code_space_code',
      table: 'option_code',
      columns: ['optionSpaceId', 'code'],
    });
    await ensureIndex({
      name: 'idx_option_code_source',
      table: 'option_code',
      columns: ['source'],
    });

    // OPTION SPACE META
    await ensureIndex({
      name: 'idx_option_space_external',
      table: 'option_space',
      columns: ['externalId'],
    });
    await ensureIndex({
      name: 'idx_option_space_name',
      table: 'option_space',
      columns: ['name'],
    });

    // GLOBAL CONFIG
    await ensureIndex({
      name: 'idx_gco_global_code',
      table: 'dhcp_global_config_option',
      columns: ['globalConfigId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_gcog_global_group',
      table: 'dhcp_global_config_option_group',
      columns: ['globalConfigId', 'optionGroupId'],
    });

    // IP SPACE
    await ensureIndex({
      name: 'idx_ipsdo_space_code',
      table: 'ip_space_dhcp_option',
      columns: ['ipSpaceId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_ipsog_space_group',
      table: 'ip_space_option_group',
      columns: ['ipSpaceId', 'optionGroupId'],
    });
    await ensureIndex({
      name: 'idx_ip_space_external',
      table: 'ip_space',
      columns: ['externalId'],
    });

    // ADDRESS BLOCK
    await ensureIndex({
      name: 'idx_ab_parent',
      table: 'address_block',
      columns: ['parentId'],
    });
    if (abSpaceCol) {
      await ensureIndex({
        name: 'idx_ab_space',
        table: 'address_block',
        columns: [abSpaceCol],
      });
    } else {
      this.logger.warn(
        'Skip index idx_ab_space: no space column (spaceId/space_id) on address_block',
      );
    }
    await ensureIndex({
      name: 'idx_abdo_block_code',
      table: 'address_block_dhcp_option',
      columns: ['addressBlockId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_abog_block_group',
      table: 'address_block_option_group',
      columns: ['addressBlockId', 'optionGroupId'],
    });

    // SUBNET
    await ensureIndex({
      name: 'idx_sn_space',
      table: 'subnet',
      columns: ['spaceId'],
    });
    await ensureIndex({
      name: 'idx_sn_block',
      table: 'subnet',
      columns: ['addressBlockId'],
    });
    await ensureIndex({
      name: 'idx_sdo_subnet_code',
      table: 'subnet_dhcp_option',
      columns: ['subnetId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_sog_subnet_group',
      table: 'subnet_option_group',
      columns: ['subnetId', 'optionGroupId'],
    });

    // RANGE
    await ensureIndex({
      name: 'idx_rg_subnet',
      table: 'range',
      columns: ['subnetId'],
    });
    await ensureIndex({
      name: 'idx_rdo_range_code',
      table: 'range_dhcp_option',
      columns: ['rangeId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_rog_range_group',
      table: 'range_option_group',
      columns: ['rangeId', 'optionGroupId'],
    });
    await ensureIndex({
      name: 'idx_rx_range',
      table: 'range_exclusion',
      columns: ['rangeId'],
    });

    // FIXED ADDRESS
    await ensureIndex({
      name: 'idx_fa_subnet',
      table: 'fixed_address',
      columns: ['subnetId'],
    });
    if (fixedOptTable) {
      await ensureIndex({
        name: 'idx_fado_fixed_code',
        table: fixedOptTable,
        columns: ['fixedAddressId', 'optionCodeId'],
      });
    } else {
      this.logger.warn(
        'Skip index idx_fado_fixed_code: no fixed_*_dhcp_option table found',
      );
    }
    await ensureIndex({
      name: 'idx_faog_fixed_group',
      table: 'fixed_address_option_group',
      columns: ['fixedAddressId', 'optionGroupId'],
    });

    // OPTION GROUP META & Zuordnung
    await ensureIndex({
      name: 'idx_og_name',
      table: 'option_group',
      columns: ['name'],
    });
    await ensureIndex({
      name: 'idx_og_external',
      table: 'option_group',
      columns: ['externalId'],
    });
    await ensureIndex({
      name: 'idx_ogdo_group_code',
      table: 'option_group_dhcp_option',
      columns: ['optionGroupId', 'optionCodeId'],
    });
    await ensureIndex({
      name: 'idx_ogdo_code_group',
      table: 'option_group_dhcp_option',
      columns: ['optionCodeId', 'optionGroupId'],
    });

    // --------- ANALYZE für existierende Tabellen ----------------------------
    const analyzeTables = [
      'option_space',
      'option_code',
      'dhcp_global_config_option',
      'dhcp_global_config_option_group',
      'ip_space',
      'ip_space_dhcp_option',
      'ip_space_option_group',
      'address_block',
      'address_block_dhcp_option',
      'address_block_option_group',
      'subnet',
      'subnet_dhcp_option',
      'subnet_option_group',
      'range',
      'range_dhcp_option',
      'range_option_group',
      'range_exclusion',
      'fixed_address',
      fixedOptTable ?? '',
      'fixed_address_option_group',
      'option_group',
      'option_group_dhcp_option',
    ].filter((t) => t.length > 0);

    for (const t of analyzeTables) {
      await analyzeIfExists(t);
    }

    this.logger.log('Performance indexes ensured across all hierarchy levels.');
  }
}
