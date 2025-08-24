import type { z } from 'zod';
import { CspIpSpaceSchema } from './zod/ip-space.zod';

export type CspIpSpaceDto = z.infer<typeof CspIpSpaceSchema>;
export { CspIpSpaceSchema };
export const parseCspIpSpace = (data: unknown): CspIpSpaceDto =>
  CspIpSpaceSchema.parse(data);
