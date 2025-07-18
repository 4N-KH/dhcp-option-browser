// src/types/dto/effective-dhcp-option-slim.dto.ts

export interface OptionGroupInSource {
  id: number;
  name: string;
  comment?: string | null;
  options: {
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
    } | null;
  }[];
  groupInheritanceType?: "GROUP_EXPLICIT" | "GROUP_INHERITED";
  isGroupInherited?: boolean;
  groupOriginLevel?: string;
  groupOriginLevelId?: number;
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
  // Zusätzliche Meta
  inheritanceType?: "EXPLICIT" | "INHERITED" | "GROUP_EXPLICIT" | "GROUP_INHERITED";
  isInherited?: boolean;
  isOverridden?: boolean;
  originChain?: {
    level: string;
    levelId: number;
    type: "EXPLICIT" | "INHERITED" | "GROUP_EXPLICIT" | "GROUP_INHERITED";
    optionGroupId?: number;
    optionGroupName?: string;
  }[];
}
