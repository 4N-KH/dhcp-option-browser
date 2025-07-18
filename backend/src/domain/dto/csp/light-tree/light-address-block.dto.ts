import { LightSubnetDto } from './light-subnet.dto';

export interface LightAddressBlockDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment: string | null;
  parentId: number | null;
  ipSpaceId: number | null;
  children: LightAddressBlockDto[];
  subnets: LightSubnetDto[];
}
