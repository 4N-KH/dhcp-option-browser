import type { z } from 'zod';
import { CspFixedAddressSchema } from './zod/fixed-address.zod';

export type CspFixedAddressDto = z.infer<typeof CspFixedAddressSchema>;
export { CspFixedAddressSchema };
export const parseCspFixedAddress = (data: unknown): CspFixedAddressDto =>
  CspFixedAddressSchema.parse(data);
