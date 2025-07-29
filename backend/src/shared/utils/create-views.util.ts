import { DataSource } from 'typeorm';

// Komplette View als SQL-String
const CREATE_DHCP_ASSIGNMENTS_VIEW_SQL = `
CREATE OR REPLACE VIEW all_dhcp_option_assignments AS
SELECT 'global'::text AS object_type,
    gco."globalConfigId" AS object_id,
    'Global Config'::character varying AS object_label,
    NULL::character varying AS address,
    NULL::character varying AS cidr,
    NULL::character varying AS ip_space,
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
    NULL::character varying AS address,
    NULL::character varying AS cidr,
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
    ab.cidr::character varying AS cidr,
    ips.name AS ip_space,
    code.code AS option_code,
    code.name AS option_name,
    code.type AS option_type,
    code.source AS option_source,
    abdo.option_value,
    abdo."optionSpaceId",
    abdo."optionCodeId",
    concat('Address Block ', ab.name, COALESCE((((' ('::text || ab.address::text) || '/'::text) || ab.cidr) || ')'::text, ''::text, ''::text)) AS object_display
   FROM address_block_dhcp_option abdo
     LEFT JOIN option_code code ON abdo."optionCodeId" = code.id
     LEFT JOIN address_block ab ON abdo."addressBlockId" = ab.id
     LEFT JOIN ip_space ips ON ab."ipSpaceId" = ips.id
UNION ALL
 SELECT 'subnet'::text AS object_type,
    s.id AS object_id,
    s.name AS object_label,
    s.address,
    s.cidr::character varying AS cidr,
    ips.name AS ip_space,
    code.code AS option_code,
    code.name AS option_name,
    code.type AS option_type,
    code.source AS option_source,
    sdo.option_value,
    sdo."optionSpaceId",
    sdo."optionCodeId",
    concat('Subnet ', s.name, COALESCE((((' ('::text || s.address::text) || '/'::text) || s.cidr) || ')'::text, ''::text, ''::text)) AS object_display
   FROM subnet_dhcp_option sdo
     LEFT JOIN option_code code ON sdo."optionCodeId" = code.id
     LEFT JOIN subnet s ON sdo."subnetId" = s.id
     LEFT JOIN ip_space ips ON s."spaceId" = ips.id
UNION ALL
 SELECT 'range'::text AS object_type,
    r.id AS object_id,
    r.name AS object_label,
    r.start AS address,
    ((r.start::text || '-'::text) || r."end"::text)::character varying AS cidr,
    ips.name AS ip_space,
    code.code AS option_code,
    code.name AS option_name,
    code.type AS option_type,
    code.source AS option_source,
    rdo.option_value,
    rdo."optionSpaceId",
    rdo."optionCodeId",
    concat('Range ', r.name, COALESCE((((' ('::text || r.start::text) || '-'::text) || r."end"::text) || ')'::text, ''::text, ''::text)) AS object_display
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
    NULL::character varying AS cidr,
    ips.name AS ip_space,
    code.code AS option_code,
    code.name AS option_name,
    code.type AS option_type,
    code.source AS option_source,
    fdo.option_value,
    fdo."optionSpaceId",
    fdo."optionCodeId",
    concat('Fixed Address ', fa.name, COALESCE((' ('::text || fa.address::text) || ')'::text, ''::text, ''::text)) AS object_display
   FROM fixed_address_dhcp_option fdo
     LEFT JOIN option_code code ON fdo."optionCodeId" = code.id
     LEFT JOIN fixed_address fa ON fdo."fixedAddressId" = fa.id
     LEFT JOIN subnet s ON fa."subnetId" = s.id
     LEFT JOIN ip_space ips ON s."spaceId" = ips.id
;
`;

// Utility, um die View nach dem Import zu erzeugen/aktualisieren
export async function createAllDhcpOptionAssignmentsView(
  dataSource: DataSource,
) {
  await dataSource.query(CREATE_DHCP_ASSIGNMENTS_VIEW_SQL);
}
