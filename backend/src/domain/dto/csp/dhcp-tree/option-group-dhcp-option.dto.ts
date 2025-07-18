export interface OptionGroupDhcpOptionDto {
  id: number;
  optionCodeId: number;
  optionSpaceId?: number | null;
  option_value: string;
  code: string;
  name: string;
  type: string | null;
  optionSpaceName: string | null;
  optionSpaceProtocol: string | null;
  comment?: string | null;
  array?: boolean | null;
  source: string;
  inheritedFrom?: string[];
}
