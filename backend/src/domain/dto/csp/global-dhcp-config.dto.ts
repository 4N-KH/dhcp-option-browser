import type { z } from 'zod';
import { CspGlobalDhcpConfigSchema } from './zod/global-dhcp-config.zod';

export type CspGlobalDhcpConfigDto = z.infer<typeof CspGlobalDhcpConfigSchema>;
export { CspGlobalDhcpConfigSchema };
export const parseCspGlobalDhcpConfig = (
  data: unknown,
): CspGlobalDhcpConfigDto => CspGlobalDhcpConfigSchema.parse(data);
