import { LightFixedAddressDto } from './light-fixed-address.dto';

export interface LightRangeDto {
  id: number;
  externalId: string;
  name: string;
  start: string;
  end: string;
  comment: string | null;
  subnetId: number;
  fixedAddresses: LightFixedAddressDto[];
}
