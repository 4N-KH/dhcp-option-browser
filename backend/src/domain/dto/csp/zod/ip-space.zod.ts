import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspIpSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment: z.string().nullable().optional(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
});

export type CspIpSpace = z.infer<typeof CspIpSpaceSchema>;
export type CspIpSpaceDto = CspIpSpace;
