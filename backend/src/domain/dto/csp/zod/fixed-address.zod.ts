import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspFixedAddressSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  ip_space: z.string(),
  match_type: z.string(),
  match_value: z.string(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
  comment: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
  inheritance_sources: z.record(z.any()).optional(),
});

export type CspFixedAddress = z.infer<typeof CspFixedAddressSchema>;
