import type { z } from 'zod';
import { CspOptionFilterSchema } from './zod/option-filter.zod';

export type CspOptionFilterDto = z.infer<typeof CspOptionFilterSchema>;
export { CspOptionFilterSchema };
export const parseCspOptionFilter = (data: unknown): CspOptionFilterDto =>
  CspOptionFilterSchema.parse(data);
