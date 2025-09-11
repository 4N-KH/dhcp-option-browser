import { z } from 'zod';

export const DhcpOptionSchema = z.object({
  group: z.string().nullable().optional(),
  option_code: z.string(),
  option_value: z.string(),
  type: z.string(),
});

export const CspOptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  dhcp_options: z.array(DhcpOptionSchema).optional(),
  comment: z.string().nullable().optional(),
  protocol: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CspOptionGroup = z.infer<typeof CspOptionGroupSchema>;
export type CspOptionGroupDto = CspOptionGroup;
