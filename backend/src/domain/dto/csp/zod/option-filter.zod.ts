// src/domain/dto/csp/zod/option-filter.zod.ts

import { z } from 'zod';

export const CspOptionFilterSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment: z.string().nullable().optional(),
  protocol: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  lease_time: z.number().nullable().optional(),
  header_option_filename: z.string().nullable().optional(),
  header_option_server_address: z.string().nullable().optional(),
  header_option_server_name: z.string().nullable().optional(),
  vendor_specific_option_option_space: z.string().nullable().optional(),

  // DHCP-Optionen als Array von Objekten
  dhcp_options: z
    .array(
      z.object({
        group: z.string().nullable().optional(),
        option_code: z.string(),
        option_value: z.string(),
        type: z.string(),
      }),
    )
    .optional(),

  // Rules-Objekt mit rules-Array
  rules: z
    .object({
      match: z.string(),
      rules: z.array(
        z.object({
          compare: z.string(),
          option_code: z.string(),
          option_value: z.string(),
          substring_offset: z.number(),
        }),
      ),
    })
    .optional(),

  // Tags als beliebiges Record (API liefert "{}" oder leeres Objekt)
  tags: z.record(z.unknown()).optional(),
});

export type CspOptionFilterDto = z.infer<typeof CspOptionFilterSchema>;
