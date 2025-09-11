import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { DhcpOptionRaw } from '@/application/services/option-hierarchy/csp/types/dhcp-option-raw.type';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

export type ContextObj = {
  level: ObjectType;
  levelId: number;
  options: DhcpOptionRaw[];
  optionGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[];
};
