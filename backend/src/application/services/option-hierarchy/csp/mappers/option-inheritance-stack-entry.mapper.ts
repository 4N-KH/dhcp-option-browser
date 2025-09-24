import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { OptionGroupMetaDto } from '@/domain/dto/csp/option-group-meta.dto';

interface StackEntryInput {
  level: ObjectType;
  levelId: number;
  value: string | null;
  isExplicit: boolean;
  isInherited: boolean;
  isOverridden: boolean;
  overriddenBy?: {
    level: ObjectType;
    levelId: number;
    value: string | null;
  };
  optionGroup?: OptionGroupMetaDto | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  name?: string | null;
}
export function mapOptionToStackEntry(
  input: StackEntryInput,
): OptionInheritanceStackEntryDto {
  return {
    level: input.level,
    levelId: input.levelId,
    value: input.value,
    isExplicit: input.isExplicit,
    isInherited: input.isInherited,
    isOverridden: input.isOverridden,
    overriddenBy: input.overriddenBy,
    optionGroup: input.optionGroup ?? null,
    comment: input.comment ?? null,
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? null,
    name: input.name ?? null,
  };
}
