import type { z } from 'zod';
import { CspSubnetSchema } from './zod/subnet.zod';

export type CspSubnetDto = z.infer<typeof CspSubnetSchema>;
export { CspSubnetSchema };
export const parseCspSubnet = (data: unknown): CspSubnetDto =>
  CspSubnetSchema.parse(data);
