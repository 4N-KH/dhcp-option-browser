import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';
import { RangeTreeDto } from './range-tree.dto';
import { FixedAddressDto } from './fixed-address.dto';

export interface SubnetTreeDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string | null;
  addressBlockId?: number | null;
  spaceId?: number | null;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  ranges: RangeTreeDto[];
  fixedAddresses: FixedAddressDto[];
}
