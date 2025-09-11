import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

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
export type CspAddressBlockDto = CspAddressBlock;
