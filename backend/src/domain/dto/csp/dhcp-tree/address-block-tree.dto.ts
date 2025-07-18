import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';
import { SubnetTreeDto } from './subnet-tree.dto';

export interface AddressBlockTreeDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string | null;
  parentId?: number | null;
  ipSpaceId?: number | null;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  children: AddressBlockTreeDto[];
  subnets: SubnetTreeDto[];
}
