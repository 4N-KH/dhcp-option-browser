import type { z } from 'zod';
import { CspConfigProfileSchema } from './zod/config-profile.zod';

export type CspConfigProfileDto = z.infer<typeof CspConfigProfileSchema>;
export { CspConfigProfileSchema };
export const parseCspConfigProfile = (data: unknown): CspConfigProfileDto =>
  CspConfigProfileSchema.parse(data);
