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
  /** Tree-Level, gleich wie object_type */
  level: RedundancyLevel;
  /** Primärschlüssel des Objekts — NEU: für Deep-Link ins Frontend */
  objectId: number;
  /** Anzeigename (Label) falls vorhanden, sonst null */
  name: string | null;
  /** Adresse/CIDR/Range-Text falls sinnvoll */
  address: string | null;
  redundantOption: RedundantOptionDto;
}
