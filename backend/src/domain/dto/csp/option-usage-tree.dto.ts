export type OptionUsageNodeType = 'group' | 'option';

// Ein Eintrag für einen Wert einer Option (z.B. 123.123.123.123)
export interface OptionUsageValueDto {
  value: string | null;
  objectCount: number;
  objects: OptionUsageObjectDto[];
}

// Einzelnes Objekt, auf dem eine Option explizit gesetzt ist
export interface OptionUsageObjectDto {
  id: number;
  label: string; // z.B. "ipSpace KH" oder "Subnet 10.0.0.0/24"
  type: string; // z.B. "ipSpace", "subnet", etc.
  overridden: boolean; // Ob Wert durch Child überschrieben wurde
  groupId?: number; // OptionGroup-Id (falls über Gruppe gesetzt)
  groupName?: string; // OptionGroup-Name (falls über Gruppe gesetzt)
  comment?: string | null;
}

// Einzeloption als Baumknoten
export interface OptionUsageOptionDto {
  readonly type: 'option';
  code: string;
  name?: string;
  objectCount: number;
  values: OptionUsageValueDto[];
}

// OptionGroup als Baumknoten
export interface OptionUsageGroupDto {
  readonly type: 'group';
  groupId: number;
  name: string;
  comment?: string | null;
  options: OptionUsageOptionInGroupDto[];
}

// Option in einer OptionGroup (reduziert)
export interface OptionUsageOptionInGroupDto {
  code: string;
  name?: string;
  values: OptionUsageValueDto[];
}

// Die Wurzel: Liste aus Gruppen + Einzeloptionen (für die Baumansicht im Frontend)
export type OptionUsageTreeDto = (OptionUsageGroupDto | OptionUsageOptionDto)[];
