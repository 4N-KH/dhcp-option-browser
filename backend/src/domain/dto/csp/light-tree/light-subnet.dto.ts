import { LightRangeDto } from './light-range.dto';
import { LightFixedAddressDto } from './light-fixed-address.dto';

export interface LightSubnetDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment: string | null;
  ranges: LightRangeDto[];
  fixedAddresses: LightFixedAddressDto[];
}
