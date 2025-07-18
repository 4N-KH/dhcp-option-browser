export interface OptionInGroupDto {
  code: string;
  name?: string;
  value: string | null;
  type?: string;
  array?: boolean;
  optionCodeComment?: string;
  optionCodeSource?: string;
  optionSpace?: {
    id: number;
    name: string;
    protocol?: string;
  };
}

export interface OptionGroupMetaDto {
  id: number;
  externalId?: string | null;
  name: string;
  protocol?: string | null;
  comment?: string | null;
  originLevel?: string;    // z.B. 'ipSpace', 'subnet', ...
  originLevelId?: number;
  options: OptionInGroupDto[]; // immer ein Array, auch wenn leer
}
