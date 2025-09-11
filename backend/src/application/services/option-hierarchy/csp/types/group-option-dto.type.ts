import { ObjectType } from '@/domain/enums/csp/object-type.enum';

export type GroupOptionDto = {
  code: string;
  name?: string;
  value: string | null;
  type?: string | null;
  array?: boolean | null;
  optionCodeComment?: string | null;
  optionCodeSource?: string | null;
  optionSpace?: any;
  level: ObjectType;
  levelId: number;
  groupId?: number;
  groupName?: string;
  redundant?: boolean;
  redundantWith?: {
    code: string;
    level: string;
    levelId: number;
    groupId?: number;
    groupName?: string;
    value?: string | null;
  };
};
