import type { z } from 'zod';
import { CspRangeSchema } from './zod/range.zod';

export type CspRangeDto = z.infer<typeof CspRangeSchema>;
export { CspRangeSchema };
export const parseCspRange = (data: unknown): CspRangeDto =>
  CspRangeSchema.parse(data);
