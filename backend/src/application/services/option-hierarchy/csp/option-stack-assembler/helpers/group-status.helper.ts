import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

export type GroupStatus = {
  group: OptionGroup;
  explicitAt: number;
  overriddenAt?: number;
};
