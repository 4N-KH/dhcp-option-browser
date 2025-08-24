import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspSubnetSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  cidr: z.number(),
  parent: z.string().nullable().optional(),
  space: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
});

export type CspSubnet = z.infer<typeof CspSubnetSchema>;
export type CspSubnetDto = CspSubnet;
