import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Row shape of the view all_dhcp_option_assignments
 * (or compatible query results).
 */
export interface AllDhcpOptionAssignmentRow {
  object_type: string;
  object_id: number;
  object_label: string;
  address: string | null;
  cidr: string | null;
  ip_space: string | null;
  option_code: string;
  option_name: string;
  option_type: string | null;
  option_source: string | null;
  option_value: string;
  optionSpaceId: number | null;
  optionCodeId: number | null;
  object_display: string;
}

/** Type for the source list in the redundancy overview */
export type SourceJsonInheritance = 'explicit' | 'inherited' | 'overridden';
export interface SourceJson {
  from: string; // e.g. "options" or "option group: <NAME>"
  inheritanceType: SourceJsonInheritance;
}

@Injectable()
export class AllDhcpOptionAssignmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  /* ------------------------------------------------------------------ */
  /* Helpers: strict, lint-safe type conversions                        */
  /* ------------------------------------------------------------------ */

  private isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  private toStringStrict(v: unknown, fallback = ''): string {
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return fallback;
  }

  private toNullableString(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
  }

  private toInt(v: unknown, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return Math.trunc(n);
    }
    return fallback;
  }

  private toNullableInt(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return Math.trunc(n);
    }
    return null;
  }

  /**
   * Strict conversion of a DB record to AllDhcpOptionAssignmentRow.
   * Incomplete rows are defensively filled with defaults.
   */
  private mapAssignmentRow(val: unknown): AllDhcpOptionAssignmentRow | null {
    if (!this.isRecord(val)) return null;
    const r = val;

    const row: AllDhcpOptionAssignmentRow = {
      object_type: this.toStringStrict(r.object_type),
      object_id: this.toInt(r.object_id, 0),
      object_label: this.toStringStrict(r.object_label),
      address: this.toNullableString(r.address),
      cidr: this.toNullableString(r.cidr),
      ip_space: this.toNullableString(r.ip_space),
      option_code: this.toStringStrict(r.option_code),
      option_name: this.toStringStrict(r.option_name),
      option_type: this.toNullableString(r.option_type),
      option_source: this.toNullableString(r.option_source),
      option_value: this.toStringStrict(r.option_value),
      optionSpaceId: this.toNullableInt(r.optionSpaceId),
      optionCodeId: this.toNullableInt(r.optionCodeId),
      object_display: this.toStringStrict(r.object_display),
    };

    if (
      !row.object_type ||
      !Number.isFinite(row.object_id) ||
      !row.option_code
    ) {
      return null;
    }
    return row;
  }

  /** Parses a JSON array column into SourceJson[] (strict, lint-safe). */
  private parseSourceJsonArray(v: unknown): SourceJson[] {
    const out: SourceJson[] = [];

    if (Array.isArray(v)) {
      for (const el of v) {
        if (this.isRecord(el)) {
          const from = this.toStringStrict(el.from, '');
          const inhRaw = this.toStringStrict(
            el.inheritanceType,
            '',
          ) as SourceJsonInheritance;
          const inheritanceType: SourceJsonInheritance =
            inhRaw === 'explicit' ||
            inhRaw === 'inherited' ||
            inhRaw === 'overridden'
              ? inhRaw
              : 'explicit';
          if (from) out.push({ from, inheritanceType });
        }
      }
      return out;
    }

    if (typeof v === 'string') {
      try {
        const parsed: unknown = JSON.parse(v);
        if (Array.isArray(parsed)) {
          return this.parseSourceJsonArray(parsed);
        }
      } catch {
        // ignore – not valid JSON
      }
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /* DB wrappers                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Wraps TypeORM `query` (typed as `any`) and returns **unknown**.
   * Not async to avoid `require-await`.
   */
  private safeQuery(
    sql: string,
    params?: readonly unknown[],
  ): Promise<unknown> {
    const q = this.dataSource.query.bind(this.dataSource) as (
      query: string,
      parameters?: readonly unknown[],
    ) => Promise<unknown>;
    return q(sql, params);
  }

  /**
   * Always returns unknown[] and prevents any propagation.
   */
  private async runQueryRows(
    sql: string,
    params?: readonly unknown[],
  ): Promise<unknown[]> {
    const res: unknown = await this.safeQuery(sql, params);
    return Array.isArray(res) ? (res as unknown[]) : [];
  }

  /* ------------------------------------------------------------------ */
  /* Public queries                                                      */
  /* ------------------------------------------------------------------ */

  /** All options for a specific (code, name[, type][, source]) */
  async findByOptionCodeNameTypeSource(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ): Promise<AllDhcpOptionAssignmentRow[]> {
    const query = `
      SELECT *
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2
      ${type ? `AND option_type = $3` : ''}
      ${source ? (type ? `AND option_source = $4` : `AND option_source = $3`) : ''}
    `;
    const params: unknown[] = [code, name];
    if (type) params.push(type);
    if (source) params.push(source);

    const rows = await this.runQueryRows(query, params);

    const out: AllDhcpOptionAssignmentRow[] = [];
    for (const v of rows) {
      const mapped = this.mapAssignmentRow(v);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  /** Aggregated value distribution for an option */
  async findValuesByOptionKey(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ): Promise<{ value: string; objectCount: number }[]> {
    const query = `
      SELECT option_value as value, COUNT(*)::int as "objectCount"
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2
      ${type ? `AND option_type = $3` : ''}
      ${source ? (type ? `AND option_source = $4` : `AND option_source = $3`) : ''}
      GROUP BY option_value
      ORDER BY "objectCount" DESC
    `;
    const params: unknown[] = [code, name];
    if (type) params.push(type);
    if (source) params.push(source);

    const rows = await this.runQueryRows(query, params);

    const out: { value: string; objectCount: number }[] = [];
    for (const v of rows) {
      if (!this.isRecord(v)) continue;
      const value = this.toStringStrict(v.value);
      const objectCount = this.toInt(v.objectCount, 0);
      out.push({ value, objectCount });
    }
    return out;
  }

  /** All objects with an exact (code,name,value[,type,source]) match */
  async findOccurrencesForOptionValue(
    code: string,
    name: string,
    value: string,
    type?: string,
    source?: string,
  ): Promise<AllDhcpOptionAssignmentRow[]> {
    const query = `
      SELECT *
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2 AND option_value = $3
      ${type ? `AND option_type = $4` : ''}
      ${source ? (type ? `AND option_source = $5` : `AND option_source = $4`) : ''}
    `;
    const params: unknown[] = [code, name, value];
    if (type) params.push(type);
    if (source) params.push(source);

    const rows = await this.runQueryRows(query, params);

    const out: AllDhcpOptionAssignmentRow[] = [];
    for (const v of rows) {
      const mapped = this.mapAssignmentRow(v);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  /** Full view */
  async findAll(): Promise<AllDhcpOptionAssignmentRow[]> {
    const rows = await this.runQueryRows(
      `SELECT * FROM all_dhcp_option_assignments`,
    );

    const out: AllDhcpOptionAssignmentRow[] = [];
    for (const v of rows) {
      const mapped = this.mapAssignmentRow(v);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  /**
   * Redundancy overview based on the view
   * (requires that option_source distinguishes sources)
   */
  async findRedundancyOverview(): Promise<
    Array<AllDhcpOptionAssignmentRow & { sources: string[] }>
  > {
    const sql = `
      SELECT
        object_type,
        object_id,
        object_label,
        address,
        option_code,
        option_name,
        option_type,
        option_value,
        ARRAY_AGG(DISTINCT option_source) AS sources
      FROM all_dhcp_option_assignments
      GROUP BY
        object_type, object_id, object_label, address,
        option_code, option_name, option_type, option_value
      HAVING COUNT(DISTINCT option_source) >= 2
      ORDER BY object_type, object_label, address, option_code
    `;
    const rows = await this.runQueryRows(sql);

    const out: Array<AllDhcpOptionAssignmentRow & { sources: string[] }> = [];
    for (const v of rows) {
      const base = this.mapAssignmentRow(v);
      if (!base) continue;

      const sources =
        this.isRecord(v) && Array.isArray(v.sources)
          ? v.sources.filter((s) => typeof s === 'string')
          : [];

      out.push({ ...base, sources });
    }
    return out;
  }

  /**
   * Redundancy detection directly from base tables (Options + Option Groups),
   * including inheritance cascades. Status reflects **Tree**:
   *   - per label **explicit** or **inherited** (no global "overridden")
   *   - redundancy = at least two labels with the same value
   *   - exactly one row per label (explicit > inherited, then next origin)
   *
   * FIX: coverage for FixedAddresses linked only via rangeId
   *      (f."subnetId" can be NULL). All f→r→s→a→i paths added.
   */
  async findRedundancyOverviewFromBase(): Promise<
    Array<{
      object_type: string;
      object_id: number;
      object_label: string | null;
      object_display: string;
      address: string | null;
      option_code: string;
      option_name: string | null;
      option_type: string | null;
      option_value: string | null;
      sources: SourceJson[];
    }>
  > {
    const sql = `
      WITH occurrences (
        object_type, object_id, object_label, address,
        option_code, option_name, option_type, option_value,
        source_type, inheritance, optionGroupId, optionGroupName,
        origin_level, origin_id, origin_label
      ) AS (
        /* -------------------- OPTIONS (explicit) -------------------- */
        SELECT 'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration'), NULL::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options'::text, 'explicit'::text, NULL::int, NULL::text,
               'global'::text, g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM dhcp_global_config g
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','explicit',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM ip_space i
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','explicit',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM address_block a
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','explicit',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM subnet s
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, rdo.option_value::text,
               'options','explicit',NULL,NULL,
               'range', r.id::int, r.name
        FROM "range" r
        JOIN range_dhcp_option rdo ON rdo."rangeId" = r.id
        JOIN option_code oc ON rdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, fdo.option_value::text,
               'options','explicit',NULL,NULL,
               'fixedAddress', f.id::int, f.name
        FROM fixed_address f
        JOIN fixed_address_dhcp_option fdo ON fdo."fixedAddressId" = f.id
        JOIN option_code oc ON fdo."optionCodeId" = oc.id

        /* -------------------- OPTION GROUPS (explicit) --------------- */
        UNION ALL
        SELECT 'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration'), NULL::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM dhcp_global_config g
        JOIN dhcp_global_config_option_group gog ON gog."globalConfigId" = g.id
        JOIN option_group og ON og.id = gog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM ip_space i
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM address_block a
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM subnet s
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'range', r.id::int, r.name
        FROM "range" r
        JOIN range_option_group rog ON rog."rangeId" = r.id
        JOIN option_group og ON og.id = rog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'fixedAddress', f.id::int, f.name
        FROM fixed_address f
        JOIN fixed_address_option_group fog ON fog."fixedAddressId" = f.id
        JOIN option_group og ON og.id = fog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        /* -------------------- OPTIONS (inherited) -------------------- */
        -- global → ipSpace / addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM ip_space i
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM address_block a
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM subnet s
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM "range" r
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM fixed_address f
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        -- ipSpace → addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM address_block a
        JOIN ip_space i ON i.id = a."ipSpaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM subnet s
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        -- FIX: ipSpace → fixedAddress auch über rangeId (falls f.subnetId NULL)
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        -- addressBlock → subnet / range / fixedAddress
        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM subnet s
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        -- FIX: addressBlock → fixedAddress über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        -- subnet → range / fixedAddress
        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        -- FIX: subnet → fixedAddress über rangeId (falls f.subnetId NULL)
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        -- range → fixedAddress  (Options)  — FIX: deckt rangeId ODER Address-Containment ab
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, rdo.option_value::text,
               'options','inherited',NULL,NULL,
               'range', r.id::int, r.name
        FROM fixed_address f
        JOIN "range" r
          ON f."rangeId" = r.id
          OR (
            r."subnetId" = f."subnetId"
            AND f.address::inet BETWEEN r.start::inet AND r."end"::inet
          )
        JOIN range_dhcp_option rdo ON rdo."rangeId" = r.id
        JOIN option_code oc ON rdo."optionCodeId" = oc.id

        /* -------------------- OPTION GROUPS (inherited) --------------- */
        -- ipSpace → addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM address_block a
        JOIN ip_space i ON i.id = a."ipSpaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM subnet s
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: ipSpace → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- addressBlock → subnet / range / fixedAddress
        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM subnet s
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: addressBlock → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- subnet → range / fixedAddress (Option-Groups)
        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: subnet → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- range → fixedAddress (Option-Groups) — FIX: deckt rangeId ODER Address-Containment ab
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'range', r.id::int, r.name
        FROM fixed_address f
        JOIN "range" r
          ON f."rangeId" = r.id
          OR (
            r."subnetId" = f."subnetId"
            AND f.address::inet BETWEEN r.start::inet AND r."end"::inet
          )
        JOIN range_option_group rog ON rog."rangeId" = r.id
        JOIN option_group og ON og.id = rog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id
      ),

      -- Normalisierte Quelle + Anzeige-Name
      src AS (
        SELECT
          object_type,
          object_id,
          object_label,

          /* Für die Anzeige: Name falls vorhanden, sonst Adresse */
          COALESCE(NULLIF(object_label, ''), address, '') AS object_display,

          /* Wenn es einen Namen gibt, dann address für die Ausgabe NULL setzen,
             damit das Frontend nicht "label • address" rendert. */
          CASE
            WHEN COALESCE(NULLIF(object_label, ''), '') <> '' THEN NULL::text
            ELSE address
          END AS address,

          option_code,
          option_name,
          option_type,
          option_value,
          CASE WHEN source_type = 'option_group'
               THEN ('option group: ' || COALESCE(optionGroupName, ''))::text
               ELSE 'options'::text
          END AS eff_label,
          inheritance AS eff_inheritance,
          origin_level,
          CASE origin_level
            WHEN 'global' THEN 1
            WHEN 'ipSpace' THEN 2
            WHEN 'addressBlock' THEN 3
            WHEN 'subnet' THEN 4
            WHEN 'range' THEN 5
            WHEN 'fixedAddress' THEN 6
            ELSE 0
          END AS origin_rank
        FROM occurrences
      ),

      /* pro Label genau EINE Zeile: explicit > inherited; dann nächstgelegene Herkunft */
      per_label_best AS (
        SELECT *
        FROM (
          SELECT
            s.*,
            ROW_NUMBER() OVER (
              PARTITION BY object_type, object_id, option_code, option_name, option_type, option_value, eff_label
              ORDER BY (s.eff_inheritance = 'explicit') DESC, s.origin_rank DESC
            ) AS rn
          FROM src s
        ) t
        WHERE t.rn = 1
      ),

      /* Keine globale Umdeklaration zu "overridden": Tree zeigt je Label den Original-Status */
      finalized AS (
        SELECT
          object_type,
          object_id,
          object_label,
          object_display,
          address,
          option_code,
          option_name,
          option_type,
          option_value,
          eff_label,
          eff_inheritance AS final_inheritance
        FROM per_label_best
      )

      SELECT
        object_type,
        object_id,
        object_label,
        object_display,
        address,
        option_code,
        option_name,
        option_type,
        option_value,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'from', eff_label,
            'inheritanceType', final_inheritance
          )
          ORDER BY eff_label
        ) AS sources
      FROM finalized
      GROUP BY
        object_type, object_id, object_label, object_display, address,
        option_code, option_name, option_type, option_value
      HAVING COUNT(*) >= 2
      ORDER BY object_type, object_display, option_code;
    `;

    const rows = await this.runQueryRows(sql);

    const out: Array<{
      object_type: string;
      object_id: number;
      object_label: string | null;
      object_display: string;
      address: string | null;
      option_code: string;
      option_name: string | null;
      option_type: string | null;
      option_value: string | null;
      sources: SourceJson[];
    }> = [];

    for (const v of rows) {
      if (!this.isRecord(v)) continue;

      const item = {
        object_type: this.toStringStrict(v.object_type),
        object_id: this.toInt(v.object_id, 0),
        object_label: this.toNullableString(v.object_label),
        object_display: this.toStringStrict(v.object_display),
        address: this.toNullableString(v.address),
        option_code: this.toStringStrict(v.option_code),
        option_name: this.toNullableString(v.option_name),
        option_type: this.toNullableString(v.option_type),
        option_value: this.toNullableString(v.option_value),
        sources: this.parseSourceJsonArray(v.sources),
      };

      if (
        !item.object_type ||
        !Number.isFinite(item.object_id) ||
        !item.option_code
      ) {
        continue;
      }
      out.push(item);
    }

    return out;
  }

  /**
   * Panel-strict redundancies (covers all blinking cases in the Options Panel):
   * - Redundancy = the same OPTION CODE appears on the same object from ≥ 2 different sources,
   *   regardless of whether the values are identical or different.
   * - Exactly one row per label (explicit > inherited, then next origin).
   * - option_value becomes "<multiple>" when multiple values exist, otherwise the single value (or '').
   * - Sources keep their inheritance status (explicit | inherited).
   */
  async findRedundancyOverviewPanelStrictFromBase(): Promise<
    Array<{
      object_type: string;
      object_id: number;
      object_label: string | null;
      object_display: string;
      address: string | null;
      option_code: string;
      option_name: string | null;
      option_type: string | null;
      option_value: string | null;
      sources: SourceJson[];
    }>
  > {
    const sql = `
      WITH occurrences (
        object_type, object_id, object_label, address,
        option_code, option_name, option_type, option_value,
        source_type, inheritance, optionGroupId, optionGroupName,
        origin_level, origin_id, origin_label
      ) AS (
        /* -------------------- OPTIONS (explicit) -------------------- */
        SELECT 'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration'), NULL::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options'::text, 'explicit'::text, NULL::int, NULL::text,
               'global'::text, g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM dhcp_global_config g
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','explicit',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM ip_space i
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','explicit',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM address_block a
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','explicit',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM subnet s
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, rdo.option_value::text,
               'options','explicit',NULL,NULL,
               'range', r.id::int, r.name
        FROM "range" r
        JOIN range_dhcp_option rdo ON rdo."rangeId" = r.id
        JOIN option_code oc ON rdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, fdo.option_value::text,
               'options','explicit',NULL,NULL,
               'fixedAddress', f.id::int, f.name
        FROM fixed_address f
        JOIN fixed_address_dhcp_option fdo ON fdo."fixedAddressId" = f.id
        JOIN option_code oc ON fdo."optionCodeId" = oc.id

        /* -------------------- OPTION GROUPS (explicit) --------------- */
        UNION ALL
        SELECT 'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration'), NULL::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM dhcp_global_config g
        JOIN dhcp_global_config_option_group gog ON gog."globalConfigId" = g.id
        JOIN option_group og ON og.id = gog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM ip_space i
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM address_block a
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM subnet s
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'range', r.id::int, r.name
        FROM "range" r
        JOIN range_option_group rog ON rog."rangeId" = r.id
        JOIN option_group og ON og.id = rog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','explicit',og.id::int, og.name,
               'fixedAddress', f.id::int, f.name
        FROM fixed_address f
        JOIN fixed_address_option_group fog ON fog."fixedAddressId" = f.id
        JOIN option_group og ON og.id = fog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        /* -------------------- OPTIONS (inherited) -------------------- */
        -- global → ipSpace / addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'ipSpace', i.id::int, i.name, NULL::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM ip_space i
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM address_block a
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM subnet s
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM "range" r
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, gdo.option_value::text,
               'options','inherited',NULL,NULL,
               'global', g.id::int, COALESCE(g.comment,'Global DHCP Configuration')
        FROM fixed_address f
        JOIN dhcp_global_config g ON TRUE
        JOIN dhcp_global_config_option gdo ON gdo."globalConfigId" = g.id
        JOIN option_code oc ON gdo."optionCodeId" = oc.id

        -- ipSpace → addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM address_block a
        JOIN ip_space i ON i.id = a."ipSpaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM subnet s
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        -- FIX: ipSpace → fixedAddress auch über rangeId (falls f.subnetId NULL)
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ido.option_value::text,
               'options','inherited',NULL,NULL,
               'ipSpace', i.id::int, i.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_dhcp_option ido ON ido."ipSpaceId" = i.id
        JOIN option_code oc ON ido."optionCodeId" = oc.id

        -- addressBlock → subnet / range / fixedAddress
        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM subnet s
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        -- FIX: addressBlock → fixedAddress über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ado.option_value::text,
               'options','inherited',NULL,NULL,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_dhcp_option ado ON ado."addressBlockId" = a.id
        JOIN option_code oc ON ado."optionCodeId" = oc.id

        -- subnet → range / fixedAddress
        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        -- FIX: subnet → fixedAddress über rangeId (falls f.subnetId NULL)
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, sdo.option_value::text,
               'options','inherited',NULL,NULL,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_dhcp_option sdo ON sdo."subnetId" = s.id
        JOIN option_code oc ON sdo."optionCodeId" = oc.id

        -- range → fixedAddress  (Options)  — FIX: deckt rangeId ODER Address-Containment ab
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, rdo.option_value::text,
               'options','inherited',NULL,NULL,
               'range', r.id::int, r.name
        FROM fixed_address f
        JOIN "range" r
          ON f."rangeId" = r.id
          OR (
            r."subnetId" = f."subnetId"
            AND f.address::inet BETWEEN r.start::inet AND r."end"::inet
          )
        JOIN range_dhcp_option rdo ON rdo."rangeId" = r.id
        JOIN option_code oc ON rdo."optionCodeId" = oc.id

        /* -------------------- OPTION GROUPS (inherited) --------------- */
        -- ipSpace → addressBlock / subnet / range / fixedAddress
        UNION ALL
        SELECT 'addressBlock', a.id::int, a.name, a.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM address_block a
        JOIN ip_space i ON i.id = a."ipSpaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM subnet s
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: ipSpace → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'ipSpace', i.id::int, i.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN ip_space i ON i.id = s."spaceId"
        JOIN ip_space_option_group iog ON iog."ipSpaceId" = i.id
        JOIN option_group og ON og.id = iog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- addressBlock → subnet / range / fixedAddress
        UNION ALL
        SELECT 'subnet', s.id::int, s.name, s.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM subnet s
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: addressBlock → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'addressBlock', a.id::int, a.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN address_block a ON a.id = s."addressBlockId"
        JOIN address_block_option_group aog ON aog."addressBlockId" = a.id
        JOIN option_group og ON og.id = aog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- subnet → range / fixedAddress (Option-Groups)
        UNION ALL
        SELECT 'range', r.id::int, r.name, (r.start || '-' || r."end")::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM "range" r
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN subnet s ON s.id = f."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- FIX: subnet → fixedAddress (Option-Groups) über rangeId
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'subnet', s.id::int, s.name
        FROM fixed_address f
        JOIN "range" r ON r.id = f."rangeId"
        JOIN subnet s ON s.id = r."subnetId"
        JOIN subnet_option_group sog ON sog."subnetId" = s.id
        JOIN option_group og ON og.id = sog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id

        -- range → fixedAddress (Option-Groups) — FIX: deckt rangeId ODER Address-Containment ab
        UNION ALL
        SELECT 'fixedAddress', f.id::int, f.name, f.address::text,
               oc.code::text, oc.name, oc.type, ogd.option_value::text,
               'option_group','inherited',og.id::int, og.name,
               'range', r.id::int, r.name
        FROM fixed_address f
        JOIN "range" r
          ON f."rangeId" = r.id
          OR (
            r."subnetId" = f."subnetId"
            AND f.address::inet BETWEEN r.start::inet AND r."end"::inet
          )
        JOIN range_option_group rog ON rog."rangeId" = r.id
        JOIN option_group og ON og.id = rog."optionGroupId"
        JOIN option_group_dhcp_option ogd ON ogd."optionGroupId" = og.id
        JOIN option_code oc ON ogd."optionCodeId" = oc.id
      ),

      -- Quelle normalisieren + Display-Name erzeugen
      src AS (
        SELECT
          object_type,
          object_id,
          object_label,

          COALESCE(NULLIF(object_label, ''), address, '') AS object_display,
          CASE
            WHEN COALESCE(NULLIF(object_label, ''), '') <> '' THEN NULL::text
            ELSE address
          END AS address,

          option_code,
          option_name,
          option_type,
          option_value,
          CASE WHEN source_type = 'option_group'
               THEN ('option group: ' || COALESCE(optionGroupName, ''))::text
               ELSE 'options'::text
          END AS eff_label,
          inheritance AS eff_inheritance,
          origin_level,
          CASE origin_level
            WHEN 'global' THEN 1
            WHEN 'ipSpace' THEN 2
            WHEN 'addressBlock' THEN 3
            WHEN 'subnet' THEN 4
            WHEN 'range' THEN 5
            WHEN 'fixedAddress' THEN 6
            ELSE 0
          END AS origin_rank
        FROM occurrences
      ),

      /* pro Label EINE Zeile: explicit > inherited; ohne Wert im Partition Key */
      per_label AS (
        SELECT *
        FROM (
          SELECT
            s.*,
            ROW_NUMBER() OVER (
              PARTITION BY object_type, object_id, option_code, option_name, option_type, eff_label
              ORDER BY (s.eff_inheritance = 'explicit') DESC, s.origin_rank DESC
            ) AS rn
          FROM src s
        ) x
        WHERE x.rn = 1
      )

      SELECT
        object_type,
        object_id,
        object_label,
        object_display,
        address,
        option_code,
        option_name,
        option_type,
        CASE
          WHEN COUNT(DISTINCT COALESCE(option_value, '')) > 1 THEN '<multiple>'
          ELSE COALESCE(MAX(option_value), '')
        END AS option_value,
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'from', eff_label,
          'inheritanceType', eff_inheritance
        )) AS sources
      FROM per_label
      GROUP BY
        object_type, object_id, object_label, object_display, address,
        option_code, option_name, option_type
      HAVING COUNT(*) >= 2
      ORDER BY object_type, object_display, option_code;
    `;

    const rows = await this.runQueryRows(sql);

    type Row = {
      object_type: unknown;
      object_id: unknown;
      object_label: unknown;
      object_display: unknown;
      address: unknown;
      option_code: unknown;
      option_name: unknown;
      option_type: unknown;
      option_value: unknown;
      sources: unknown;
    };

    const out: Array<{
      object_type: string;
      object_id: number;
      object_label: string | null;
      object_display: string;
      address: string | null;
      option_code: string;
      option_name: string | null;
      option_type: string | null;
      option_value: string | null;
      sources: SourceJson[];
    }> = [];

    for (const v of rows as Row[]) {
      if (!this.isRecord(v)) continue;

      const item = {
        object_type: this.toStringStrict(v.object_type),
        object_id: this.toInt(v.object_id, 0),
        object_label: this.toNullableString(v.object_label),
        object_display: this.toStringStrict(v.object_display),
        address: this.toNullableString(v.address),
        option_code: this.toStringStrict(v.option_code),
        option_name: this.toNullableString(v.option_name),
        option_type: this.toNullableString(v.option_type),
        option_value: this.toNullableString(v.option_value),
        sources: this.parseSourceJsonArray(v.sources),
      };

      if (
        !item.object_type ||
        !Number.isFinite(item.object_id) ||
        !item.option_code
      ) {
        continue;
      }
      out.push(item);
    }

    return out;
  }
}
