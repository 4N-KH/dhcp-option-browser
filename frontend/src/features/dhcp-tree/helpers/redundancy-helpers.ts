import { EffectiveDhcpOptionSlimDto, OptionGroupInSource, OptionInGroupDto } from "@/types/dto/effective-dhcp-option-slim.dto";

// groupId IMMER dabei, auch ""/undefined
export function getOptionKey(
  code: string,
  value: string | null,
  level: string | undefined,
  levelId: number | undefined,
  groupId?: number
): string {
  return [code, value ?? "", level, levelId, groupId ?? ""].join("|");
}

export function getOptionKeyFromTableOption(opt: EffectiveDhcpOptionSlimDto): string {
  const groupId = opt.source.optionGroup?.id;
  return getOptionKey(opt.code, opt.effectiveValue ?? null, opt.source.level, opt.source.levelId, groupId);
}

export function getOptionKeyFromGroupOption(opt: OptionInGroupDto, group: OptionGroupInSource): string {
  return getOptionKey(opt.code, opt.value ?? null, group.groupOriginLevel, group.groupOriginLevelId, group.id);
}
