// src/domain/dto/csp/effective-dhcp-option-slim.dto.ts

export class EffectiveDhcpOptionSlimDto {
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
    type: 'EXPLICIT' | 'INHERITED' | 'GROUP_EXPLICIT' | 'GROUP_INHERITED';
    originLevel?: string;
    originLevelId?: number;
    originLevelLabel?: string;
    optionGroup?: {
      id: number;
      name: string;
      comment?: string | null;
      options: {
        level: import('../../enums/csp/object-type.enum').ObjectType;
        levelId: number;
        code: string;
        name?: string;
        value: string | null;
        type?: string | null;
        array?: boolean | null;
        // === Redundanz-Felder für Optionen innerhalb Gruppen ===
        redundant?: boolean;
        redundantWith?: {
          code: string;
          level: string;
          levelId: number;
          groupId?: number;
          groupName?: string;
          value?: string | null;
        };
      }[];
      groupInheritanceType?: 'GROUP_EXPLICIT' | 'GROUP_INHERITED';
      isGroupInherited?: boolean;
      groupOriginLevel?: string;
      groupOriginLevelId?: number;
      originLevelLabel?: string;
    };
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

  inheritanceType?:
    | 'EXPLICIT'
    | 'INHERITED'
    | 'GROUP_EXPLICIT'
    | 'GROUP_INHERITED';
  isInherited?: boolean;
  isOverridden?: boolean;

  originChain?: {
    level: string;
    levelId: number;
    type: 'EXPLICIT' | 'INHERITED' | 'GROUP_EXPLICIT' | 'GROUP_INHERITED';
    optionGroupId?: number;
    optionGroupName?: string;
  }[];

  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  // === Redundanz-Felder für Einzeloptionen ===
  redundant?: boolean;
  redundantWith?: {
    code: string;
    level: string;
    levelId: number;
    groupId?: number;
    groupName?: string;
    value?: string | null;
  };
}
