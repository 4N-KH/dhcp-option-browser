import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';

export interface FixedAddressDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  match_type: string;
  match_value: string;
  comment?: string | null;
  subnetId?: number | null;
  rangeId?: number | null;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
}
