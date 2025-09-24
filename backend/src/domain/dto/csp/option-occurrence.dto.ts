import { ObjectType } from '@/domain/enums/csp/object-type.enum';

export type OptionSetStatus = 'explicit' | 'inherited' | 'overridden';

/**
 * Occurrence of a DHCP option on a specific object (Subnet, Range, etc.)
 */
export interface OptionOccurrenceDto {
  objectType: ObjectType;
  objectId: number;
  objectLabel: string | null;

  /** Ergonomic, frontend-formatted label */
  objectDisplay: string;

  /** Address (e.g. network address, start IP, etc.) */
  address?: string | null;
  /** CIDR or prefix (e.g. 24) */
  cidr?: string | null;
  /** IP space, if applicable */
  ipSpace?: string | null;

  /** Effective option value */
  value: string | null;

  setStatus: OptionSetStatus;

  /** Set only when inherited */
  inheritedFrom?: {
    objectType: ObjectType;
    objectId: number;
    objectLabel: string | null;
    address?: string | null;
    cidr?: string | null;
    objectDisplay?: string;
  };
  /** Set only when overridden */
  overriddenBy?: {
    objectType: ObjectType;
    objectId: number;
    objectLabel: string | null;
    address?: string | null;
    cidr?: string | null;
    objectDisplay?: string;
  };
  /** Option type (e.g. string, ip-address, etc.) */
  type?: string | null;
  /** Source of the option (e.g. OptionGroup, GlobalConfig, etc.) */
  source?: string | null;

  /** OptionSpaceId for context */
  optionSpaceId?: number | null;
  /** OptionCodeId for context */
  optionCodeId?: number | null;
}
