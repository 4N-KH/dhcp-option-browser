import type { z } from 'zod';
import { CspOptionGroupSchema } from './zod/option-group.zod';

export type CspOptionGroupDto = z.infer<typeof CspOptionGroupSchema>;
export { CspOptionGroupSchema };
export const parseCspOptionGroup = (data: unknown): CspOptionGroupDto =>
  CspOptionGroupSchema.parse(data);
