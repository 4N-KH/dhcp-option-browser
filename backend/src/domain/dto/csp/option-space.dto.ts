import type { z } from 'zod';
import { CspOptionSpaceSchema } from './zod/option-space.zod';

export type CspOptionSpaceDto = z.infer<typeof CspOptionSpaceSchema>;
export { CspOptionSpaceSchema };
export const parseCspOptionSpace = (data: unknown): CspOptionSpaceDto =>
  CspOptionSpaceSchema.parse(data);
