export type RedundancyLevel =
  | 'global'
  | 'ipSpace'
  | 'addressBlock'
  | 'subnet'
  | 'range'
  | 'fixedAddress';

export interface SourceJson {
  from: string; // e.g. "options" or "option group: <NAME>"
  inheritanceType: 'explicit' | 'inherited' | 'overridden';
}

export interface RedundantOptionDto {
  code: string;
  name: string;
  value: string;
  type?: string;
  setIn: SourceJson[];
}

export interface RedundancyOverviewItemDto {
  /** Tree level, same as object_type */
  level: RedundancyLevel;
  /** Primary key of the object — used for deep-linking in the frontend */
  objectId: number;
  /** Display name (label) if available, otherwise null */
  name: string | null;
  /** Address/CIDR/Range text if applicable */
  address: string | null;
  redundantOption: RedundantOptionDto;
}
