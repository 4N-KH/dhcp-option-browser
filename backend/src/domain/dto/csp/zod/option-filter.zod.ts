import { z } from 'zod';
import { DhcpOptionSchema } from './dhcp-option.zod';

export const CspOptionFilterSchema = z.object({
  id: z.string(),
  name: z.string(),

  rules: z.object({
    match: z.string(),
    rules: z.array(
      z.object({
        compare: z.string().nullable().optional(),
        option_code: z.string().nullable().optional(),
        option_value: z.string().nullable().optional(),
        substring_offset: z.number().nullable().optional(),
      }),
    ),
  }),

  dhcp_options: z.array(DhcpOptionSchema).optional(),

  comment: z.string().nullable().optional(),
  protocol: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  lease_time: z.number().nullable().optional(),

  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),

  header_option_filename: z.string().nullable().optional(),
  header_option_server_address: z.string().nullable().optional(),
  header_option_server_name: z.string().nullable().optional(),
  vendor_specific_option_option_space: z.string().nullable().optional(),
});

export type CspOptionFilter = z.infer<typeof CspOptionFilterSchema>;
