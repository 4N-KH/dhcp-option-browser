// backend/src/infrastructure/database/csp/option-group-overview.repository.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type CountRow = {
  group_id: number;
  group_name: string;
  object_type: string; // global | ipSpace | addressBlock | subnet | range | fixedAddress
  status: 'explicit' | 'inherited' | 'overridden';
  cnt: number;
};

type OccurrenceRow = {
  group_id: number;
  group_name: string;
  object_type: string;
  object_id: number;
  object_label: string;
  object_display: string;
  address: string | null;
  cidr: string | null;
  ip_space: string | null;
  status: 'explicit' | 'inherited' | 'overridden';
};

@Injectable()
export class OptionGroupOverviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Effektive Gruppen je Objekt: explicit (lokal) oder inherited (nächstliegende Herkunft),
   * zusätzlich "overridden" für geerbte Zuweisungen, die auf demselben Zielobjekt
   * von einer lokalen Zuweisung derselben Gruppe verdrängt werden.
   *
   * Liefert Aggregatsummen je (group_id, object_type, status).
   *
   * Hinweis: Logik entspricht deinem bestehenden "nearest-origin"-Ansatz:
   *   - explicit bevorzugt vor inherited
   *   - je Objekt und Gruppe max. 1 effektiver Eintrag (explicit|inherited)
   *   - overridden zählt NICHT zur Effektiv-Summe.
   */
  async countByGroupEffectiveWithOverridden(): Promise<CountRow[]> {
    const sql = `
      WITH
      /* ------------------- Rohzuweisungen je Herkunftsebene ------------------- */
      g AS ( SELECT gc.id AS global_id, og.id AS group_id, og.name AS group_name
             FROM dhcp_global_config_option_group x
             JOIN dhcp_global_config gc ON gc.id = x.global_config_id
             JOIN option_group og ON og.id = x.option_group_id ),
      i AS ( SELECT ip.id AS ipspace_id, og.id AS group_id, og.name AS group_name
             FROM ip_space_option_group x
             JOIN ip_space ip ON ip.id = x.ip_space_id
             JOIN option_group og ON og.id = x.option_group_id ),
      ab AS ( SELECT a.id AS address_block_id, og.id AS group_id, og.name AS group_name
              FROM address_block_option_group x
              JOIN address_block a ON a.id = x.address_block_id
              JOIN option_group og ON og.id = x.option_group_id ),
      s AS ( SELECT sn.id AS subnet_id, og.id AS group_id, og.name AS group_name
             FROM subnet_option_group x
             JOIN subnet sn ON sn.id = x.subnet_id
             JOIN option_group og ON og.id = x.option_group_id ),
      r AS ( SELECT rg.id AS range_id, og.id AS group_id, og.name AS group_name
             FROM range_option_group x
             JOIN range rg ON rg.id = x.range_id
             JOIN option_group og ON og.id = x.option_group_id ),
      fa AS ( SELECT f.id AS fixed_address_id, og.id AS group_id, og.name AS group_name
              FROM fixed_address_option_group x
              JOIN fixed_address f ON f.id = x.fixed_address_id
              JOIN option_group og ON og.id = x.option_group_id ),

      /* ------------------- Zielobjekte mit Aufstiegs-Kette ------------------- */
      targets AS (
        -- global config
        SELECT 'global'::text AS object_type, gc.id::int AS object_id,
               COALESCE(gc.comment,'Global DHCP Configuration') AS object_label,
               'Global Config'::text AS object_display,
               NULL::text AS address, NULL::text AS cidr, NULL::text AS ip_space,
               gc.id::int AS global_id,
               NULL::int AS ipspace_id, NULL::int AS address_block_id, NULL::int AS subnet_id, NULL::int AS range_id, NULL::int AS fixed_address_id
        FROM dhcp_global_config gc

        UNION ALL
        SELECT 'ipSpace', ip.id, COALESCE(ip.name,'IP Space') AS object_label,
               COALESCE(ip.name,'IP Space') AS object_display,
               NULL, NULL, NULL,
               ip.global_config_id AS global_id,
               ip.id AS ipspace_id, NULL, NULL, NULL, NULL
        FROM ip_space ip

        UNION ALL
        SELECT 'addressBlock', ablk.id, COALESCE(ablk.name,'Address Block') AS object_label,
               COALESCE(ablk.name,'Address Block') AS object_display,
               NULL, ablk.cidr::text, (SELECT name FROM ip_space WHERE id = ablk.ip_space_id),
               (SELECT global_config_id FROM ip_space WHERE id = ablk.ip_space_id) AS global_id,
               ablk.ip_space_id AS ipspace_id, ablk.id AS address_block_id, NULL, NULL, NULL
        FROM address_block ablk

        UNION ALL
        SELECT 'subnet', sn.id, COALESCE(sn.name,'Subnet') AS object_label,
               COALESCE(sn.name,'Subnet') AS object_display,
               sn.address::text, sn.cidr::text, (SELECT name FROM ip_space WHERE id = sn.ip_space_id),
               (SELECT global_config_id FROM ip_space WHERE id = sn.ip_space_id) AS global_id,
               sn.ip_space_id AS ipspace_id,
               sn.address_block_id AS address_block_id, sn.id AS subnet_id, NULL, NULL
        FROM subnet sn

        UNION ALL
        SELECT 'range', rg.id, COALESCE(rg.name,'Range') AS object_label,
               COALESCE(rg.name,'Range') AS object_display,
               (rg.start_address || ' - ' || rg.end_address)::text AS address, NULL::text,
               (SELECT name FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id)),
               (SELECT global_config_id FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id)) AS global_id,
               (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id) AS ipspace_id,
               (SELECT address_block_id FROM subnet WHERE id = rg.subnet_id) AS address_block_id,
               rg.subnet_id AS subnet_id, rg.id AS range_id, NULL
        FROM range rg

        UNION ALL
        SELECT 'fixedAddress', fa2.id, COALESCE(fa2.name,'Fixed Address') AS object_label,
               COALESCE(fa2.name,'Fixed Address') AS object_display,
               fa2.ip_address::text AS address, NULL::text,
               (SELECT name FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id))),
               (SELECT global_config_id FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id))) AS global_id,
               (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id)) AS ipspace_id,
               (SELECT address_block_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id)) AS address_block_id,
               (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id) AS subnet_id,
               (SELECT fa2.range_id) AS range_id,
               fa2.id AS fixed_address_id
        FROM fixed_address fa2
      ),

      /* ------------------- Kandidaten: alle möglichen Herkünfte je Zielobjekt+Gruppe ------------------- */
      candidates AS (
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'global'::text AS origin_level, 1 AS origin_rank, g.group_id, g.group_name,
               CASE WHEN t.object_type = 'global' THEN 'explicit' ELSE 'inherited' END AS status
        FROM targets t
        JOIN g ON g.global_id = t.global_id

        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'ipSpace', 2, i.group_id, i.group_name,
               CASE WHEN t.object_type = 'ipSpace' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN i ON i.ipspace_id = t.ipspace_id

        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'addressBlock', 3, ab.group_id, ab.group_name,
               CASE WHEN t.object_type = 'addressBlock' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN ab ON ab.address_block_id = t.address_block_id

        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'subnet', 4, s.group_id, s.group_name,
               CASE WHEN t.object_type = 'subnet' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN s ON s.subnet_id = t.subnet_id

        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'range', 5, r.group_id, r.group_name,
               CASE WHEN t.object_type = 'range' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN r ON r.range_id = t.range_id

        UNION ALL
        SELECT t.object_type, t.object_id, t.object_label, t.object_display, t.address, t.cidr, t.ip_space,
               'fixedAddress', 6, fa.group_id, fa.group_name,
               CASE WHEN t.object_type = 'fixedAddress' THEN 'explicit' ELSE 'inherited' END
        FROM targets t
        JOIN fa ON fa.fixed_address_id = t.fixed_address_id
      ),

      /* ------------------- Beste (nächstliegende) Herkunft pro Objekt+Gruppe ------------------- */
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

      /* ------------------- Overridden: geerbte Kandidaten, die am selben Zielobjekt von explicit verdrängt werden ------------------- */
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

      /* ------------------- Aggregation je Gruppe/Level/Status ------------------- */
      SELECT group_id, group_name, object_type,
             'explicit'::text AS status, COUNT(*)::int AS cnt
      FROM per_object_best
      WHERE status = 'explicit'
      GROUP BY group_id, group_name, object_type

      UNION ALL
      SELECT group_id, group_name, object_type,
             'inherited', COUNT(*)::int
      FROM per_object_best
      WHERE status = 'inherited'
      GROUP BY group_id, group_name, object_type

      UNION ALL
      SELECT group_id, group_name, object_type,
             'overridden', COUNT(*)::int
      FROM overridden
      GROUP BY group_id, group_name, object_type

      ORDER BY group_name, object_type, status;
    `;

    return this.dataSource.query<CountRow[]>(sql);
  }

  /**
   * Effektive Vorkommen je Objekt für eine konkrete Gruppe (inkl. "overridden"-Infos).
   */
  async findOccurrencesByGroupId(groupId: number): Promise<OccurrenceRow[]> {
    const sql = `
      WITH
      g AS ( SELECT gc.id AS global_id, og.id AS group_id, og.name AS group_name
             FROM dhcp_global_config_option_group x
             JOIN dhcp_global_config gc ON gc.id = x.global_config_id
             JOIN option_group og ON og.id = x.option_group_id
             WHERE og.id = $1 ),
      i AS ( SELECT ip.id AS ipspace_id, og.id AS group_id, og.name AS group_name
             FROM ip_space_option_group x
             JOIN ip_space ip ON ip.id = x.ip_space_id
             JOIN option_group og ON og.id = x.option_group_id
             WHERE og.id = $1 ),
      ab AS ( SELECT a.id AS address_block_id, og.id AS group_id, og.name AS group_name
              FROM address_block_option_group x
              JOIN address_block a ON a.id = x.address_block_id
              JOIN option_group og ON og.id = x.option_group_id
              WHERE og.id = $1 ),
      s AS ( SELECT sn.id AS subnet_id, og.id AS group_id, og.name AS group_name
             FROM subnet_option_group x
             JOIN subnet sn ON sn.id = x.subnet_id
             JOIN option_group og ON og.id = x.option_group_id
             WHERE og.id = $1 ),
      r AS ( SELECT rg.id AS range_id, og.id AS group_id, og.name AS group_name
             FROM range_option_group x
             JOIN range rg ON rg.id = x.range_id
             JOIN option_group og ON og.id = x.option_group_id
             WHERE og.id = $1 ),
      fa AS ( SELECT f.id AS fixed_address_id, og.id AS group_id, og.name AS group_name
              FROM fixed_address_option_group x
              JOIN fixed_address f ON f.id = x.fixed_address_id
              JOIN option_group og ON og.id = x.option_group_id
              WHERE og.id = $1 ),

      targets AS (
        SELECT 'global'::text AS object_type, gc.id::int AS object_id,
               COALESCE(gc.comment,'Global DHCP Configuration') AS object_label,
               'Global Config'::text AS object_display,
               NULL::text AS address, NULL::text AS cidr, NULL::text AS ip_space,
               gc.id::int AS global_id,
               NULL::int AS ipspace_id, NULL::int AS address_block_id, NULL::int AS subnet_id, NULL::int AS range_id, NULL::int AS fixed_address_id
        FROM dhcp_global_config gc

        UNION ALL
        SELECT 'ipSpace', ip.id, COALESCE(ip.name,'IP Space'),
               COALESCE(ip.name,'IP Space'),
               NULL, NULL, NULL,
               ip.global_config_id,
               ip.id, NULL, NULL, NULL, NULL
        FROM ip_space ip

        UNION ALL
        SELECT 'addressBlock', ablk.id, COALESCE(ablk.name,'Address Block'),
               COALESCE(ablk.name,'Address Block'),
               NULL, ablk.cidr::text, (SELECT name FROM ip_space WHERE id = ablk.ip_space_id),
               (SELECT global_config_id FROM ip_space WHERE id = ablk.ip_space_id),
               ablk.ip_space_id, ablk.id, NULL, NULL, NULL
        FROM address_block ablk

        UNION ALL
        SELECT 'subnet', sn.id, COALESCE(sn.name,'Subnet'),
               COALESCE(sn.name,'Subnet'),
               sn.address::text, sn.cidr::text, (SELECT name FROM ip_space WHERE id = sn.ip_space_id),
               (SELECT global_config_id FROM ip_space WHERE id = sn.ip_space_id),
               sn.ip_space_id, sn.address_block_id, sn.id, NULL, NULL
        FROM subnet sn

        UNION ALL
        SELECT 'range', rg.id, COALESCE(rg.name,'Range'),
               COALESCE(rg.name,'Range'),
               (rg.start_address || ' - ' || rg.end_address)::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id)),
               (SELECT global_config_id FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id)),
               (SELECT ip_space_id FROM subnet WHERE id = rg.subnet_id),
               (SELECT address_block_id FROM subnet WHERE id = rg.subnet_id),
               rg.subnet_id, rg.id, NULL
        FROM range rg

        UNION ALL
        SELECT 'fixedAddress', fa2.id, COALESCE(fa2.name,'Fixed Address'),
               COALESCE(fa2.name,'Fixed Address'),
               fa2.ip_address::text, NULL::text,
               (SELECT name FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id))),
               (SELECT global_config_id FROM ip_space WHERE id = (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id))),
               (SELECT ip_space_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id)),
               (SELECT address_block_id FROM subnet WHERE id = (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id)),
               (SELECT rg.subnet_id FROM range rg WHERE rg.id = fa2.range_id),
               fa2.range_id,
               fa2.id
        FROM fixed_address fa2
      ),

      candidates AS (
        SELECT t.*, 'global'::text AS origin_level, 1 AS origin_rank, g.group_id, g.group_name,
               CASE WHEN t.object_type = 'global' THEN 'explicit' ELSE 'inherited' END AS status
        FROM targets t JOIN g ON g.global_id = t.global_id
        UNION ALL
        SELECT t.*, 'ipSpace', 2, i.group_id, i.group_name,
               CASE WHEN t.object_type = 'ipSpace' THEN 'explicit' ELSE 'inherited' END
        FROM targets t JOIN i ON i.ipspace_id = t.ipspace_id
        UNION ALL
        SELECT t.*, 'addressBlock', 3, ab.group_id, ab.group_name,
               CASE WHEN t.object_type = 'addressBlock' THEN 'explicit' ELSE 'inherited' END
        FROM targets t JOIN ab ON ab.address_block_id = t.address_block_id
        UNION ALL
        SELECT t.*, 'subnet', 4, s.group_id, s.group_name,
               CASE WHEN t.object_type = 'subnet' THEN 'explicit' ELSE 'inherited' END
        FROM targets t JOIN s ON s.subnet_id = t.subnet_id
        UNION ALL
        SELECT t.*, 'range', 5, r.group_id, r.group_name,
               CASE WHEN t.object_type = 'range' THEN 'explicit' ELSE 'inherited' END
        FROM targets t JOIN r ON r.range_id = t.range_id
        UNION ALL
        SELECT t.*, 'fixedAddress', 6, fa.group_id, fa.group_name,
               CASE WHEN t.object_type = 'fixedAddress' THEN 'explicit' ELSE 'inherited' END
        FROM targets t JOIN fa ON fa.fixed_address_id = t.fixed_address_id
      ),

      per_object_best AS (
        SELECT *
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (PARTITION BY object_type, object_id, group_id ORDER BY origin_rank DESC) AS rn
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

      SELECT group_id, group_name,
             object_type, object_id, object_label, object_display, address, cidr, ip_space,
             status
      FROM per_object_best

      UNION ALL
      SELECT o.group_id, (SELECT name FROM option_group WHERE id = o.group_id),
             o.object_type, o.object_id, o.object_label, o.object_display, o.address, o.cidr, o.ip_space,
             'overridden'::text AS status
      FROM overridden o

      ORDER BY object_type, object_label, object_id;
    `;

    return this.dataSource.query<OccurrenceRow[]>(sql, [groupId]);
  }
}
