import { z } from 'zod';

// Zentrales Schema für DHCP-Optionen (zentral anlegen und überall verwenden!)
export const DhcpOptionSchema = z.object({
  group: z.string().nullable().optional(),
  option_code: z.string().nullable(),
  option_value: z.string().nullable(),
  type: z.string().nullable(),
});

// 1. Address Block
export const CspAddressBlockSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  cidr: z.number(),
  comment: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
  space: z.string().nullable().optional(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
});

export type CspAddressBlock = z.infer<typeof CspAddressBlockSchema>;
