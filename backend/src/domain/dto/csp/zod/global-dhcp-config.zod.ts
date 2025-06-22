import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspGlobalDhcpConfigSchema = z.object({
  dhcp_options: z.array(DhcpOptionSchema).optional(),
  dhcp_options_v6: z.array(DhcpOptionSchema).optional(),
  comment: z.string().nullable().optional(),
});

export type CspGlobalDhcpConfig = z.infer<typeof CspGlobalDhcpConfigSchema>;
