import { DhcpOptionDto } from './dhcp-option.dto';
import { OptionGroupDto } from './option-group.dto';
import { IpSpaceTreeDto } from './ip-space-tree.dto';

export interface GlobalDhcpConfigTreeDto {
  id: number;
  comment?: string | null;
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  ipSpaces: IpSpaceTreeDto[];
}
