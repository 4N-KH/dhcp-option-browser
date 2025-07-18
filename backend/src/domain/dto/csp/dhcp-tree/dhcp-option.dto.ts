export interface DhcpOptionDto {
  id: number;
  option_code: string;
  option_value: string;
  type: string;
  optionCodeId?: number | null;
  optionSpaceId?: number | null;
  code?: string | null;
  name?: string | null;
  optionSpaceName?: string | null;
  optionSpaceProtocol?: string | null;
  comment?: string | null;
  array?: boolean | null;
  createdAt: string;
  updatedAt: string;
  source: string;
  inheritedFrom?: string[];
}
