import { z } from 'zod';

export const CspOptionSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  option_codes: z.array(z.string().nullable().optional()).optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CspOptionSpace = z.infer<typeof CspOptionSpaceSchema>;
