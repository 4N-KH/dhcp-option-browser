import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspOptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),

  dhcp_options: z.array(DhcpOptionSchema).optional(),

  comment: z.string().nullable().optional(),
  protocol: z.string().nullable().optional(),
});

export type CspOptionGroup = z.infer<typeof CspOptionGroupSchema>;
