// backend/src/domain/interfaces/option-filter-rule.interface.ts

export interface OptionFilterRule {
  compare: string;
  option_code: string;
  option_value: string;
  substring_offset?: number;
}

export interface OptionFilterRulesContainer {
  match: string;
  rules: OptionFilterRule[];
}
