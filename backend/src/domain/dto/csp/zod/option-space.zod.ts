import { z } from 'zod';

export const CspOptionSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment: z.string().nullable().optional(),
  protocol: z.string().nullable().optional(),
  // tags: z.record(z.any()).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CspOptionSpace = z.infer<typeof CspOptionSpaceSchema>;
export type CspOptionSpaceDto = CspOptionSpace;
