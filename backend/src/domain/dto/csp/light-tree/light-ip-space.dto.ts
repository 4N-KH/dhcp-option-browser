import { LightAddressBlockDto } from './light-address-block.dto';
import { LightSubnetDto } from './light-subnet.dto';

export interface LightIpSpaceDto {
  id: number;
  externalId: string;
  name: string;
  comment: string | null;
  addressBlocks: LightAddressBlockDto[];
  subnets: LightSubnetDto[];
}
