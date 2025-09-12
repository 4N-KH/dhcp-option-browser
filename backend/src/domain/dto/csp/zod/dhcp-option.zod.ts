import { z } from 'zod';

export const DhcpOptionSchema = z.object({
  group: z.string().nullable().optional(),
  option_code: z.string().nullable(),
  option_value: z.string().nullable(),
  type: z.string().nullable(),
});

export type DhcpOption = z.infer<typeof DhcpOptionSchema>;
