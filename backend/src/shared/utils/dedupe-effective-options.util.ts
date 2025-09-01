import { DataSource } from 'typeorm';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import type { GroupOptionDto } from '@/application/services/option-hierarchy/csp/types/option-stack-assembler/types/group-option-dto.type';

/**
 * Entfernt 100% identische Einzeloptionen (Key) und Duplikate von Gruppen-Panels (selbe ID/Namen).
 * Nur der erste Panel-Eintrag einer Gruppe bleibt, alle weiteren werden entfernt.
 */
export function dedupeEffectiveDhcpOptionSlimDtoArray(
  options: EffectiveDhcpOptionSlimDto[],
): EffectiveDhcpOptionSlimDto[] {
  const singleOptKeys = new Set<string>();
  const seenGroupIds = new Set<number>(); // Nur EIN Panel pro Gruppe
  const result: EffectiveDhcpOptionSlimDto[] = [];

  function getOptionSpaceId(opt: {
    optionSpace?: { id?: number | null } | null;
  }): string {
    const id =
      opt && opt.optionSpace && typeof opt.optionSpace.id === 'number'
        ? opt.optionSpace.id
        : undefined;
    return id !== undefined ? String(id) : '';
  }

  for (const opt of options) {
    // Einzeloption (keine Gruppe)
    if (
      opt.code &&
      (!opt.source?.optionGroup ||
        !Array.isArray(opt.source?.optionGroup?.options))
    ) {
      const key = [
        opt.code,
        opt.effectiveValue ?? '',
        opt.type ?? '',
        getOptionSpaceId(opt),
        opt.source?.level ?? '',
        opt.source?.levelId ?? '',
      ].join('|');
      if (singleOptKeys.has(key)) continue;
      singleOptKeys.add(key);
      result.push(opt);
      continue;
    }

    // Gruppen-Panels: nur einen Eintrag pro Group-ID behalten!
    if (
      opt.source?.optionGroup &&
      typeof opt.source.optionGroup.id === 'number'
    ) {
      const groupId = opt.source.optionGroup.id;
      if (seenGroupIds.has(groupId)) continue;
      seenGroupIds.add(groupId);

      // Dedupe innerhalb der Gruppe
      const dedupedGroupOptions: GroupOptionDto[] = [];
      const seenGroupKeys = new Set<string>();
      for (const groupOptRaw of opt.source.optionGroup.options) {
        const groupOpt = groupOptRaw as GroupOptionDto;
        const groupKey = [
          groupId,
          groupOpt.code,
          groupOpt.value ?? '',
          groupOpt.type ?? '',
          getOptionSpaceId(groupOpt),
          groupOpt.level ?? '',
          groupOpt.levelId ?? '',
        ].join('|');
        if (seenGroupKeys.has(groupKey)) continue;
        seenGroupKeys.add(groupKey);
        dedupedGroupOptions.push(groupOpt);
      }
      if (dedupedGroupOptions.length > 0) {
        result.push({
          ...opt,
          source: {
            ...opt.source,
            optionGroup: {
              ...opt.source.optionGroup,
              options: dedupedGroupOptions,
            },
          },
        });
      }
    }
  }

  return result;
}

/* =========================================================================================
 *  BASE_UNION: vereinigt alle Objekt-Ebenen (global, ip_space, address_block, subnet, range, fixed_address)
 *  mit einheitlichem Spaltenlayout.
 * =======================================================================================*/
const BASE_UNION = `
SELECT 'global'::text AS object_type,
  gco."globalConfigId" AS object_id,
  'Global Config'::varchar AS object_label,
  NULL::varchar AS address,
  NULL::varchar AS cidr,
  NULL::varchar AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  gco.option_value,
  gco."optionSpaceId",
  gco."optionCodeId",
  'Global Config'::text AS object_display
FROM dhcp_global_config_option gco
LEFT JOIN option_code code ON gco."optionCodeId" = code.id
UNION ALL
SELECT 'ip_space'::text AS object_type,
  ips.id AS object_id,
  ips.name AS object_label,
  NULL::varchar AS address,
  NULL::varchar AS cidr,
  ips.name AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  ipso.option_value,
  ipso."optionSpaceId",
  ipso."optionCodeId",
  concat('IP Space ', ips.name) AS object_display
FROM ip_space_dhcp_option ipso
LEFT JOIN option_code code ON ipso."optionCodeId" = code.id
LEFT JOIN ip_space ips ON ipso."ipSpaceId" = ips.id
UNION ALL
SELECT 'address_block'::text AS object_type,
  ab.id AS object_id,
  ab.name AS object_label,
  ab.address,
  ab.cidr::varchar AS cidr,
  ips.name AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  abdo.option_value,
  abdo."optionSpaceId",
  abdo."optionCodeId",
  concat('Address Block ', ab.name, COALESCE(' ('||ab.address||'/'||ab.cidr||')','')) AS object_display
FROM address_block_dhcp_option abdo
LEFT JOIN option_code code ON abdo."optionCodeId" = code.id
LEFT JOIN address_block ab ON abdo."addressBlockId" = ab.id
LEFT JOIN ip_space ips ON ab."ipSpaceId" = ips.id
UNION ALL
SELECT 'subnet'::text AS object_type,
  s.id AS object_id,
  s.name AS object_label,
  s.address,
  s.cidr::varchar AS cidr,
  ips.name AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  sdo.option_value,
  sdo."optionSpaceId",
  sdo."optionCodeId",
  concat('Subnet ', s.name, COALESCE(' ('||s.address||'/'||s.cidr||')','')) AS object_display
FROM subnet_dhcp_option sdo
LEFT JOIN option_code code ON sdo."optionCodeId" = code.id
LEFT JOIN subnet s ON sdo."subnetId" = s.id
LEFT JOIN ip_space ips ON s."spaceId" = ips.id
UNION ALL
SELECT 'range'::text AS object_type,
  r.id AS object_id,
  r.name AS object_label,
  r.start AS address,
  (r.start||'-'||r."end")::varchar AS cidr,
  ips.name AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  rdo.option_value,
  rdo."optionSpaceId",
  rdo."optionCodeId",
  concat('Range ', r.name, COALESCE(' ('||r.start||'-'||r."end"||')','')) AS object_display
FROM range_dhcp_option rdo
LEFT JOIN option_code code ON rdo."optionCodeId" = code.id
LEFT JOIN range r ON rdo."rangeId" = r.id
LEFT JOIN subnet s ON r."subnetId" = s.id
LEFT JOIN ip_space ips ON s."spaceId" = ips.id
UNION ALL
SELECT 'fixed_address'::text AS object_type,
  fa.id AS object_id,
  fa.name AS object_label,
  fa.address,
  NULL::varchar AS cidr,
  ips.name AS ip_space,
  code.code AS option_code,
  code.name AS option_name,
  code.type AS option_type,
  code.source AS option_source,
  fdo.option_value,
  fdo."optionSpaceId",
  fdo."optionCodeId",
  concat('Fixed Address ', fa.name, COALESCE(' ('||fa.address||')','')) AS object_display
FROM fixed_address_dhcp_option fdo
LEFT JOIN option_code code ON fdo."optionCodeId" = code.id
LEFT JOIN fixed_address fa ON fdo."fixedAddressId" = fa.id
LEFT JOIN subnet s ON fa."subnetId" = s.id
LEFT JOIN ip_space ips ON s."spaceId" = ips.id
`;

/* =========================================================================================
 *  View-Erzeugung: all_dhcp_option_assignments
 *  WICHTIG: DISTINCT ON enthält jetzt auch COALESCE(option_source,'')
 *  => Mehrere Quellen (options / option group: X / …) bleiben als eigene Zeilen erhalten.
 * =======================================================================================*/
export const CREATE_DHCP_ASSIGNMENTS_VIEW_SQL = `
CREATE OR REPLACE VIEW all_dhcp_option_assignments AS
SELECT DISTINCT ON (
  object_type,
  object_id,
  option_code,
  COALESCE(option_value, ''),
  COALESCE("optionSpaceId", -1),
  COALESCE(option_source, '')
)
  object_type,
  object_id,
  object_label,
  address,
  cidr,
  ip_space,
  option_code,
  option_name,
  option_type,
  option_source,
  option_value,
  "optionSpaceId",
  "optionCodeId",
  object_display
FROM (
  ${BASE_UNION}
) u
ORDER BY
  object_type,
  object_id,
  option_code,
  COALESCE(option_value, ''),
  COALESCE("optionSpaceId", -1),
  COALESCE(option_source, ''),
  object_display;
`;

/** View erzeugen/aktualisieren */
export async function createAllDhcpOptionAssignmentsView(
  dataSource: DataSource,
) {
  await dataSource.query(CREATE_DHCP_ASSIGNMENTS_VIEW_SQL);
}
