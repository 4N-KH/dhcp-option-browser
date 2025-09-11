// backend/src/domain/dto/csp/optimization-preview-item.dto.ts

export type OptimizationAction =
  | 'DELETE_EXPLICIT'
  | 'STRIP_GROUP_OPTION'
  | 'CLONE_GROUP_WITHOUT_OPTION_AND_REASSIGN';

export interface OptimizationPreviewItemDto {
  level:
    | 'global'
    | 'ipSpace'
    | 'addressBlock'
    | 'subnet'
    | 'range'
    | 'fixedAddress';
  objectId: number;
  objectDisplay: string;
  name: string | null;
  address: string | null;

  option: {
    code: string;
    name: string;
    type?: string;
    value: string;
  };

  targetSource:
    | { kind: 'explicit' }
    | { kind: 'group'; groupId: number; groupName: string };

  keeperSource:
    | { kind: 'inherited'; fromLabel: string }
    | { kind: 'group'; groupId: number; groupName: string };

  action: OptimizationAction;

  groupMutation?: {
    code: string;
    value: string;
    newGroupNameSuggestion?: string;
    reasonForClone?: 'group_is_reused_elsewhere';
  };

  reason: string;

  safety: {
    effectiveValueUnchangedOnObject: boolean;
    effectiveValueUnchangedOnDescendants?: boolean;
    notes?: string[];
  };
}
