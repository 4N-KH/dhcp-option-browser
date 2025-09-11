import type { z } from 'zod';
import { CspOptionCodeSchema } from './zod/option-code.zod';

export type CspOptionCodeDto = z.infer<typeof CspOptionCodeSchema>;
export { CspOptionCodeSchema };
export const parseCspOptionCode = (data: unknown): CspOptionCodeDto =>
  CspOptionCodeSchema.parse(data);
