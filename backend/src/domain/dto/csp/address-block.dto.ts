import type { z } from 'zod';
import { CspAddressBlockSchema } from './zod/address-block.zod';

/** Public DTO type derived from the Zod schema (single source of truth) */
export type CspAddressBlockDto = z.infer<typeof CspAddressBlockSchema>;

/** Optional: re-export the schema */
export { CspAddressBlockSchema };

/** Optional: ergonomic parser */
export const parseCspAddressBlock = (data: unknown): CspAddressBlockDto =>
  CspAddressBlockSchema.parse(data);
