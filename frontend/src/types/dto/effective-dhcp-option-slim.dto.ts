// src/types/dto/effective-dhcp-option-slim.dto.ts
export type GroupSetStatus = "GROUP_EXPLICIT" | "GROUP_INHERITED";

export type RedundantWithInfo = {
  code: string;
  value: string | null;
  level: string;
  levelId: number;
  groupId?: number;
};

export interface OptionInGroupDto {
  code: string;
  name?: string;
  value: string | null;
  type?: string | null;
  array?: boolean | null;
  optionCodeComment?: string | null;
  optionCodeSource?: string | null;
  optionSpace?: {
    id: number;
    name: string;
    protocol?: string | null;
    comment?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  level: string;      // backend liefert String
  levelId: number;
  groupId?: number;
  groupName?: string;
  redundant?: boolean;
  redundantWith?: RedundantWithInfo;
}

export interface OptionGroupInSource {
  id: number;
  name: string;
  comment?: string | null;
  options: OptionInGroupDto[];
  groupInheritanceType?: GroupSetStatus;
  isGroupInherited?: boolean;
  groupOriginLevel?: string;
  groupOriginLevelId?: number;
  originLevelLabel?: string;
}

export interface EffectiveDhcpOptionSlimDto {
  code: string;
  name?: string;
  effectiveValue: string | null;
  type?: string | null;
  array?: boolean | null;
  optionCodeComment?: string | null;
  optionCodeSource?: string | null;
  optionSpace?: {
    id: number;
    name: string;
    protocol?: string | null;
  } | null;

  source: {
    level: string;
    levelId: number;
    type: "EXPLICIT" | "INHERITED" | "GROUP_EXPLICIT" | "GROUP_INHERITED";
    originLevel?: string;
    originLevelId?: number;
    originLevelLabel?: string;
    optionGroup?: OptionGroupInSource;
  };

  overridden?: {
    level: string;
    levelId: number;
    value: string | null;
    optionGroup?: {
      id: number;
      name: string;
      comment?: string | null;
    };
  };

  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  inheritanceType?:
    | "EXPLICIT"
    | "INHERITED"
    | "GROUP_EXPLICIT"
    | "GROUP_INHERITED";
  isInherited?: boolean;
  isOverridden?: boolean;
  originChain?: {
    level: string;
    levelId: number;
    type: "EXPLICIT" | "INHERITED" | "GROUP_EXPLICIT" | "GROUP_INHERITED";
    optionGroupId?: number;
    optionGroupName?: string;
  }[];
  redundant?: boolean;
  redundantWith?: RedundantWithInfo;
}
