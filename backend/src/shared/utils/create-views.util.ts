import { DataSource } from 'typeorm';

/* Base query combining all DHCP object levels (global, ip_space, address_block, subnet, range, fixed_address)
   into a unified column layout. */
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
  'options'::text AS option_source,
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
  'options'::text AS option_source,
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
  'options'::text AS option_source,
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
  'options'::text AS option_source,
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
  'options'::text AS option_source,
  rdo.option_value,
  rdo."optionSpaceId",
  rdo."optionCodeId",
  concat('Range ', r.name, COALESCE(' ('||r.start||'-'||r."end"||')','')) AS object_display
FROM range_dhcp_option rdo
LEFT JOIN option_code code ON rdo."optionCodeId" = code.id
LEFT JOIN "range" r ON rdo."rangeId" = r.id
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
  'options'::text AS option_source,
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

/* View creation: all_dhcp_option_assignments with DISTINCT ON including option_source
   to preserve separate rows for multiple sources (options vs. option group). */
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

/**
 * Creates or updates the database view all_dhcp_option_assignments.
 */
export async function createAllDhcpOptionAssignmentsView(
  dataSource: DataSource,
) {
  await dataSource.query(CREATE_DHCP_ASSIGNMENTS_VIEW_SQL);
}
