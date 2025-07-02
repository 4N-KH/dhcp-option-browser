import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

function toDhcpOptionArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

export const CspGlobalDhcpConfigSchema = z.object({
  dhcp_options: z.preprocess(toDhcpOptionArray, z.array(DhcpOptionSchema)),
  comment: z.string().nullable().optional(),
});

export type CspGlobalDhcpConfig = z.infer<typeof CspGlobalDhcpConfigSchema>;
