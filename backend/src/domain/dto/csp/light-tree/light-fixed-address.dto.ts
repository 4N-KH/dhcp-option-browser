export interface LightFixedAddressDto {
  id: number;
  externalId: string;
  name: string;
  ip: string;
  type: string;
  mac: string;
  comment: string | null;
  rangeId: number | null;
  subnetId: number | null;
}
