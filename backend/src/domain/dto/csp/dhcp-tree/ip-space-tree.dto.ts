import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';
import { AddressBlockTreeDto } from './address-block-tree.dto';
import { SubnetTreeDto } from './subnet-tree.dto';

export interface IpSpaceTreeDto {
  id: number;
  externalId: string;
  name: string;
  comment?: string | null;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  addressBlocks: AddressBlockTreeDto[];
  subnets: SubnetTreeDto[];
}
