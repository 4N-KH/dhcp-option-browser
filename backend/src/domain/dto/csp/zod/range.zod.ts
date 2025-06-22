import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspRangeSchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.string(),
  end: z.string(),
  parent: z.string().nullable().optional(),
  space: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),

  dhcp_options: z.array(DhcpOptionSchema).optional(),

  exclusion_ranges: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        comment: z.string().nullable().optional(),
      }),
    )
    .optional(),

  inheritance_sources: z.record(z.any()).optional(),
});

export type CspRange = z.infer<typeof CspRangeSchema>;
