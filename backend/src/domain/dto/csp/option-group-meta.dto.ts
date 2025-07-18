// src/domain/dto/csp/option-group-meta.dto.ts

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
  } | null;
}

export class OptionGroupMetaDto {
  id: number;
  externalId: string;
  name: string;
  protocol?: string | null;
  comment?: string | null;
  options?: OptionInGroupDto[];
}
