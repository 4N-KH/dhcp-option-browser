import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';
import { ExclusionRangeDto } from './exclusion-range.dto';
import { FixedAddressDto } from './fixed-address.dto';

export interface RangeTreeDto {
  id: number;
  externalId: string;
  name: string;
  start: string;
  end: string;
  comment?: string | null;
  subnetId: number;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  exclusionRanges: ExclusionRangeDto[];
  fixedAddresses: FixedAddressDto[];
}
