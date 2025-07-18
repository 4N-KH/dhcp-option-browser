import { OptionGroupDhcpOptionDto } from './option-group-dhcp-option.dto';

export interface OptionGroupDto {
  id: number;
  externalId: string;
  name: string;
  comment?: string | null;
  protocol?: string | null;
  options: OptionGroupDhcpOptionDto[];
}
