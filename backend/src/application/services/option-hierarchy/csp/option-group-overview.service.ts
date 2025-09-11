// backend/src/application/services/option-hierarchy/csp/option-group-overview.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  OptionGroupOverviewDto,
  OptionGroupOccurrenceDto,
} from '@/domain/dto/csp/option-group-overview.dto';
import { OptionInGroupDto } from '@/domain/dto/csp/option-group-options.dto';

type LevelKey =
  | 'global'
  | 'ipSpace'
  | 'addressBlock'
  | 'subnet'
  | 'range'
  | 'fixedAddress';
type StatusKey = 'explicit' | 'inherited' | 'overridden';

function emptyLevel() {
  return { total: 0, explicit: 0, inherited: 0, overridden: 0 };
}

function assertUnreachable(x: never): never {
  throw new Error(`Unknown status: ${String(x)}`);
}

function incStatus(
  obj: { explicit: number; inherited: number; overridden: number },
  status: StatusKey,
  by: number,
) {
  switch (status) {
    case 'explicit':
      obj.explicit += by;
      return;
    case 'inherited':
      obj.inherited += by;
      return;
    case 'overridden':
      obj.overridden += by;
      return;
    default:
      return assertUnreachable(status);
  }
}

@Injectable()
export class OptionGroupOverviewService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview(): Promise<OptionGroupOverviewDto[]> {
    const sql = `
      WITH
      g AS (
        SELECT DISTINCT og.id AS group_id, og.name AS group_name
        FROM dhcp_global_config_option_group x
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      i AS (
        SELECT ip.id AS "ipSpaceId", og.id AS group_id, og.name AS group_name
        FROM ip_space_option_group x
        JOIN ip_space ip ON ip.id = x."ipSpaceId"
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      ab AS (
        SELECT a.id AS "addressBlockId", og.id AS group_id, og.name AS group_name
        FROM address_block_option_group x
        JOIN address_block a ON a.id = x."addressBlockId"
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      s AS (
        SELECT sn.id AS "subnetId", og.id AS group_id, og.name AS group_name
        FROM subnet_option_group x
        JOIN subnet sn ON sn.id = x."subnetId"
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      r AS (
        SELECT rg.id AS "rangeId", og.id AS group_id, og.name AS group_name
        FROM range_option_group x
        JOIN "range" rg ON rg.id = x."rangeId"
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      fa AS (
        SELECT f.id AS "fixedAddressId", og.id AS group_id, og.name AS group_name
        FROM fixed_address_option_group x
        JOIN fixed_address f ON f.id = x."fixedAddressId"
        JOIN option_group og ON og.id = x."optionGroupId"
      ),
      targets AS (
        SELECT 'global'::text AS object_type, gc.id::int AS object_id,
               COALESCE(gc.comment, 'Global DHCP Configuration') AS object_label,
               'Global Config'::text AS object_display,
               NULL::text AS address, NULL::text AS cidr, NULL::text AS ip_space,
               NULL::int AS "ipSpaceId", NULL::int AS "addressBlockId",
               NULL::int AS "subnetId", NULL::int AS "rangeId", NULL::int AS "fixedAddressId"
        FROM dhcp_global_config gc
        UNION ALL
        SELECT 'ipSpace', ip.id, COALESCE(ip.name,'IP Space'), COALESCE(ip.name,'IP Space'),
               NULL, NULL, NULL, ip.id, NULL, NULL, NULL, NULL
        FROM ip_space ip
        UNION ALL
        SELECT 'addressBlock', ablk.id, COALESCE(ablk.name,'Address Block'), COALESCE(ablk.name,'Address Block'),
               NULL, ablk.cidr::text, (SELECT name FROM ip_space WHERE id = ablk."ipSpaceId"),
               ablk."ipSpaceId", ablk.id, NULL, NULL, NULL
        FROM address_block ablk
        UNION ALL
        SELECT 'subnet', sn.id, COALESCE(sn.name,'Subnet'), COALESCE(sn.name,'Subnet'),
               sn.address::text, sn.cidr::text,
               (SELECT name FROM ip_space WHERE id = COALESCE(sn."spaceId",(SELECT "ipSpaceId" FROM address_block WHERE id = sn."addressBlockId"))),
               COALESCE(sn."spaceId",(SELECT "ipSpaceId" FROM address_block WHERE id = sn."addressBlockId")),
               sn."addressBlockId", sn.id, NULL, NULL
        FROM subnet sn
        UNION ALL
        SELECT 'range', rg.id, COALESCE(rg.name,'Range'), COALESCE(rg.name,'Range'),
               (rg.start || ' - ' || rg."end")::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = COALESCE((SELECT "spaceId" FROM subnet WHERE id = rg."subnetId"),
                                                              (SELECT "ipSpaceId" FROM address_block WHERE id = (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId")))),
               COALESCE((SELECT "spaceId" FROM subnet WHERE id = rg."subnetId"),
                        (SELECT "ipSpaceId" FROM address_block WHERE id = (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId"))),
               (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId"),
               rg."subnetId", rg.id, NULL
        FROM "range" rg
        UNION ALL
        SELECT 'fixedAddress', fa2.id, COALESCE(fa2.name,'Fixed Address'), COALESCE(fa2.name,'Fixed Address'),
               fa2.address::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = COALESCE(
                  (SELECT "spaceId" FROM subnet WHERE id = fa2."subnetId"),
                  (SELECT "spaceId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
                  (SELECT "ipSpaceId" FROM address_block WHERE id = (
                    SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")
                  ))
               )),
               COALESCE(
                 (SELECT "spaceId" FROM subnet WHERE id = fa2."subnetId"),
                 (SELECT "spaceId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
                 (SELECT "ipSpaceId" FROM address_block WHERE id = (
                   SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")
                 ))
               ),
               COALESCE(
                 (SELECT "addressBlockId" FROM subnet WHERE id = fa2."subnetId"),
                 (SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId"))
               ),
               COALESCE(fa2."subnetId", (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
               fa2."rangeId",
               fa2.id
        FROM fixed_address fa2
      ),
      candidates AS (
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'global'::text AS origin_level, 1 AS origin_rank, g.group_id, g.group_name,
               CASE WHEN t.object_type = 'global' THEN 'explicit' ELSE 'inherited' END AS status
        FROM targets t
        CROSS JOIN g
        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'ipSpace', 2, i.group_id, i.group_name,
               CASE WHEN t.object_type = 'ipSpace' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN i ON i."ipSpaceId" = t."ipSpaceId"
        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'addressBlock', 3, ab.group_id, ab.group_name,
               CASE WHEN t.object_type = 'addressBlock' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN ab ON ab."addressBlockId" = t."addressBlockId"
        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'subnet', 4, s.group_id, s.group_name,
               CASE WHEN t.object_type = 'subnet' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN s ON s."subnetId" = t."subnetId"
        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'range', 5, r.group_id, r.group_name,
               CASE WHEN t.object_type = 'range' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN r ON r."rangeId" = t."rangeId"
        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'fixedAddress', 6, fa.group_id, fa.group_name,
               CASE WHEN t.object_type = 'fixedAddress' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN fa ON fa."fixedAddressId" = t."fixedAddressId"
      ),
      per_object_best AS (
        SELECT *
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (
                   PARTITION BY object_type, object_id, group_id
                   ORDER BY origin_rank DESC
                 ) AS rn
          FROM candidates c
        ) t
        WHERE t.rn = 1
      ),
      overridden AS (
        SELECT c.object_type, c.object_id, c.group_id, c.group_name,
               c.object_label, c.object_display, c.address, c.cidr, c.ip_space
        FROM candidates c
        JOIN per_object_best b
          ON b.object_type = c.object_type
         AND b.object_id   = c.object_id
         AND b.group_id    = c.group_id
        WHERE b.status = 'explicit' AND c.status = 'inherited'
      )
      SELECT group_id, group_name, object_type, 'explicit'::text AS status, COUNT(*)::int AS cnt
      FROM per_object_best
      WHERE status = 'explicit'
      GROUP BY group_id, group_name, object_type
      UNION ALL
      SELECT group_id, group_name, object_type, 'inherited', COUNT(*)::int
      FROM per_object_best
      WHERE status = 'inherited'
      GROUP BY group_id, group_name, object_type
      UNION ALL
      SELECT group_id, group_name, object_type, 'overridden', COUNT(*)::int
      FROM overridden
      GROUP BY group_id, group_name, object_type
      ORDER BY group_name, object_type, status;
    `;

    const rows = await this.dataSource.query<
      {
        group_id: number;
        group_name: string;
        object_type: LevelKey;
        status: StatusKey;
        cnt: number;
      }[]
    >(sql);

    const byGroup = new Map<number, OptionGroupOverviewDto>();
    for (const r of rows) {
      const g = byGroup.get(r.group_id) ?? {
        groupId: r.group_id,
        groupName: r.group_name,
        counts: { total: 0, explicit: 0, inherited: 0, overridden: 0 },
        byLevel: {
          global: emptyLevel(),
          ipSpace: emptyLevel(),
          addressBlock: emptyLevel(),
          subnet: emptyLevel(),
          range: emptyLevel(),
          fixedAddress: emptyLevel(),
        },
      };

      if (r.status === 'explicit' || r.status === 'inherited') {
        g.counts.total += r.cnt;
        g.byLevel[r.object_type].total += r.cnt;
      }
      incStatus(g.counts, r.status, r.cnt);
      incStatus(g.byLevel[r.object_type], r.status, r.cnt);

      byGroup.set(r.group_id, g);
    }

    return Array.from(byGroup.values()).sort((a, b) =>
      a.groupName.localeCompare(b.groupName),
    );
  }

  async getOccurrences(groupId: number): Promise<OptionGroupOccurrenceDto[]> {
    const sql = `
      WITH
      g AS (
        SELECT og.id AS group_id, og.name AS group_name
        FROM dhcp_global_config_option_group x
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      i AS (
        SELECT ip.id AS "ipSpaceId", og.id AS group_id, og.name AS group_name
        FROM ip_space_option_group x
        JOIN ip_space ip ON ip.id = x."ipSpaceId"
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      ab AS (
        SELECT a.id AS "addressBlockId", og.id AS group_id, og.name AS group_name
        FROM address_block_option_group x
        JOIN address_block a ON a.id = x."addressBlockId"
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      s AS (
        SELECT sn.id AS "subnetId", og.id AS group_id, og.name AS group_name
        FROM subnet_option_group x
        JOIN subnet sn ON sn.id = x."subnetId"
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      r AS (
        SELECT rg.id AS "rangeId", og.id AS group_id, og.name AS group_name
        FROM range_option_group x
        JOIN "range" rg ON rg.id = x."rangeId"
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      fa AS (
        SELECT f.id AS "fixedAddressId", og.id AS group_id, og.name AS group_name
        FROM fixed_address_option_group x
        JOIN fixed_address f ON f.id = x."fixedAddressId"
        JOIN option_group og ON og.id = x."optionGroupId"
        WHERE og.id = $1
      ),
      targets AS (
        SELECT 'global'::text AS object_type, gc.id::int AS object_id,
               COALESCE(gc.comment, 'Global DHCP Configuration') AS object_label,
               'Global Config'::text AS object_display,
               NULL::text AS address, NULL::text AS cidr, NULL::text AS ip_space,
               NULL::int AS "ipSpaceId", NULL::int AS "addressBlockId",
               NULL::int AS "subnetId", NULL::int AS "rangeId", NULL::int AS "fixedAddressId"
        FROM dhcp_global_config gc
        UNION ALL
        SELECT 'ipSpace', ip.id, COALESCE(ip.name,'IP Space'), COALESCE(ip.name,'IP Space'),
               NULL, NULL, NULL, ip.id, NULL, NULL, NULL, NULL
        FROM ip_space ip
        UNION ALL
        SELECT 'addressBlock', ablk.id, COALESCE(ablk.name,'Address Block'), COALESCE(ablk.name,'Address Block'),
               NULL, ablk.cidr::text, (SELECT name FROM ip_space WHERE id = ablk."ipSpaceId"),
               ablk."ipSpaceId", ablk.id, NULL, NULL, NULL
        FROM address_block ablk
        UNION ALL
        SELECT 'subnet', sn.id, COALESCE(sn.name,'Subnet'), COALESCE(sn.name,'Subnet'),
               sn.address::text, sn.cidr::text,
               (SELECT name FROM ip_space WHERE id = COALESCE(sn."spaceId",(SELECT "ipSpaceId" FROM address_block WHERE id = sn."addressBlockId"))),
               COALESCE(sn."spaceId",(SELECT "ipSpaceId" FROM address_block WHERE id = sn."addressBlockId")),
               sn."addressBlockId", sn.id, NULL, NULL
        FROM subnet sn
        UNION ALL
        SELECT 'range', rg.id, COALESCE(rg.name,'Range'), COALESCE(rg.name,'Range'),
               (rg.start || ' - ' || rg."end")::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = COALESCE((SELECT "spaceId" FROM subnet WHERE id = rg."subnetId"),
                                                              (SELECT "ipSpaceId" FROM address_block WHERE id = (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId")))),
               COALESCE((SELECT "spaceId" FROM subnet WHERE id = rg."subnetId"),
                        (SELECT "ipSpaceId" FROM address_block WHERE id = (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId"))),
               (SELECT "addressBlockId" FROM subnet WHERE id = rg."subnetId"),
               rg."subnetId", rg.id, NULL
        FROM "range" rg
        UNION ALL
        SELECT 'fixedAddress', fa2.id, COALESCE(fa2.name,'Fixed Address'), COALESCE(fa2.name,'Fixed Address'),
               fa2.address::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = COALESCE(
                  (SELECT "spaceId" FROM subnet WHERE id = fa2."subnetId"),
                  (SELECT "spaceId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
                  (SELECT "ipSpaceId" FROM address_block WHERE id = (
                    SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")
                  ))
               )),
               COALESCE(
                 (SELECT "spaceId" FROM subnet WHERE id = fa2."subnetId"),
                 (SELECT "spaceId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
                 (SELECT "ipSpaceId" FROM address_block WHERE id = (
                   SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")
                 ))
               ),
               COALESCE(
                 (SELECT "addressBlockId" FROM subnet WHERE id = fa2."subnetId"),
                 (SELECT "addressBlockId" FROM subnet WHERE id = (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId"))
               ),
               COALESCE(fa2."subnetId", (SELECT "subnetId" FROM "range" WHERE id = fa2."rangeId")),
               fa2."rangeId",
               fa2.id
        FROM fixed_address fa2
      ),
      candidates AS (
        SELECT t.*, 'global'::text AS origin_level, 1 AS origin_rank, g.group_id, g.group_name,
               CASE WHEN t.object_type = 'global' THEN 'explicit' ELSE 'inherited' END AS status
        FROM targets t
        JOIN g ON TRUE
        UNION ALL
        SELECT t.*, 'ipSpace', 2, i.group_id, i.group_name,
               CASE WHEN t.object_type = 'ipSpace' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN i ON i."ipSpaceId" = t."ipSpaceId"
        UNION ALL
        SELECT t.*, 'addressBlock', 3, ab.group_id, ab.group_name,
               CASE WHEN t.object_type = 'addressBlock' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN ab ON ab."addressBlockId" = t."addressBlockId"
        UNION ALL
        SELECT t.*, 'subnet', 4, s.group_id, s.group_name,
               CASE WHEN t.object_type = 'subnet' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN s ON s."subnetId" = t."subnetId"
        UNION ALL
        SELECT t.*, 'range', 5, r.group_id, r.group_name,
               CASE WHEN t.object_type = 'range' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN r ON r."rangeId" = t."rangeId"
        UNION ALL
        SELECT t.*, 'fixedAddress', 6, fa.group_id, fa.group_name,
               CASE WHEN t.object_type = 'fixedAddress' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN fa ON fa."fixedAddressId" = t."fixedAddressId"
      ),
      per_object_best AS (
        SELECT *
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (
                   PARTITION BY object_type, object_id, group_id
                   ORDER BY origin_rank DESC
                 ) AS rn
          FROM candidates c
        ) t
        WHERE t.rn = 1
      ),
      overridden AS (
        SELECT c.object_type, c.object_id, c.group_id, c.group_name,
               c.object_label, c.object_display, c.address, c.cidr, c.ip_space
        FROM candidates c
        JOIN per_object_best b
          ON b.object_type = c.object_type
         AND b.object_id   = c.object_id
         AND b.group_id    = c.group_id
        WHERE b.status = 'explicit' AND c.status = 'inherited'
      )
      SELECT object_type, object_id,
             COALESCE(object_label, object_display) AS object_label,
             object_display, address, cidr, ip_space,
             'explicit'::text AS status
      FROM per_object_best
      WHERE group_id = $1 AND status = 'explicit'
      UNION ALL
      SELECT object_type, object_id,
             COALESCE(object_label, object_display), object_display, address, cidr, ip_space,
             'inherited'
      FROM per_object_best
      WHERE group_id = $1 AND status = 'inherited'
      UNION ALL
      SELECT object_type, object_id,
             COALESCE(object_label, object_display), object_display, address, cidr, ip_space,
             'overridden'
      FROM overridden
      WHERE group_id = $1
      ORDER BY object_type, object_label, address NULLS LAST, status;
    `;

    const rows = await this.dataSource.query<
      {
        object_type: LevelKey;
        object_id: number;
        object_label: string;
        object_display: string;
        address: string | null;
        cidr: string | null;
        ip_space: string | null;
        status: StatusKey;
      }[]
    >(sql, [groupId]);

    return rows.map((r) => ({
      objectType: r.object_type,
      objectId: r.object_id,
      objectLabel: r.object_label,
      objectDisplay: r.object_display,
      address: r.address,
      cidr: r.cidr,
      ipSpace: r.ip_space,
      setStatus: r.status,
    }));
  }

  /**
   * Listet die Optionen, die in der OptionGroup *definiert* sind – inkl. Wert.
   */
  async getGroupOptions(groupId: number): Promise<OptionInGroupDto[]> {
    const sql = `
      SELECT
        oc.id                 AS option_code_id,
        oc.code               AS code,
        oc.name               AS name,
        os.id                 AS space_id,
        os.name               AS space_name,
        ogdo.option_value::text AS value
      FROM option_group_dhcp_option ogdo
      JOIN option_code oc        ON oc.id = ogdo."optionCodeId"
      LEFT JOIN option_space os  ON os.id = oc."optionSpaceId"
      WHERE ogdo."optionGroupId" = $1
      ORDER BY os.name NULLS LAST, oc.code, oc.name;
    `;
    const rows = await this.dataSource.query<
      {
        option_code_id: number;
        code: number;
        name: string;
        space_id: number | null;
        space_name: string | null;
        value: string | null;
      }[]
    >(sql, [groupId]);

    return rows.map<OptionInGroupDto>((r) => ({
      optionCodeId: r.option_code_id,
      code: r.code,
      name: r.name,
      spaceId: r.space_id,
      spaceName: r.space_name,
      value: r.value,
    }));
  }
}
