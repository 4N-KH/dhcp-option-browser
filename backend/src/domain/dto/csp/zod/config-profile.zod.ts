import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspConfigProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment: z.string().nullable().optional(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
  inheritance_sources: z.record(z.any()).optional(),
});

export type CspConfigProfile = z.infer<typeof CspConfigProfileSchema>;
