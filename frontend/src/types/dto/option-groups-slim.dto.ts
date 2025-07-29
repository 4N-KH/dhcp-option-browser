// src/domain/dto/csp/option-view/option-groups-slim.dto.ts

/**
 * Kompakte Info zu einer Option Group, die als Quelle dient.
 */
export interface OptionGroupSlimDto {
  optionGroupId: number;
  name: string;
  protocol?: string | null;
  options: OptionGroupEntryDto[];
}

/**
 * Einzeloption innerhalb einer Option Group.
 */
export interface OptionGroupEntryDto {
  optionCodeId: number;
  code: string;
  name: string;
  value: string | null;
}
