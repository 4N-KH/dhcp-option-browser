import type { z } from 'zod';
import { CspAddressBlockSchema } from './zod/address-block.zod';

/** Öffentlicher DTO-Typ: abgeleitet vom Zod-Schema (Single Source of Truth) */
export type CspAddressBlockDto = z.infer<typeof CspAddressBlockSchema>;

/** Optional: Schema re-exportieren */
export { CspAddressBlockSchema };

/** Optional: ergonomischer Parser */
export const parseCspAddressBlock = (data: unknown): CspAddressBlockDto =>
  CspAddressBlockSchema.parse(data);
