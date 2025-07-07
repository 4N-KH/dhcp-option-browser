import { z } from 'zod';

export const CspOptionCodeSchema = z.object({
  id: z.string(),
  code: z.number(),
  name: z.string(),
  type: z.string(),
  option_space: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),

  source: z.string().nullable().optional(),
  array: z.boolean().nullable().optional(),

  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CspOptionCode = z.infer<typeof CspOptionCodeSchema>;
