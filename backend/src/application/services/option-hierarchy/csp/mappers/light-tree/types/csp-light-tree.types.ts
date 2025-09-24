import {
  IpSpace,
  AddressBlock,
  Subnet,
  Range,
  FixedAddress,
} from '@/infrastructure/database/csp';

export type IpSpaceWithChildren = IpSpace & {
  addressBlocks?: AddressBlockWithChildren[];
  subnets?: SubnetWithChildren[];
  hasRedundancy?: boolean;
};

export type AddressBlockWithChildren = AddressBlock & {
  children?: AddressBlockWithChildren[];
  subnets?: SubnetWithChildren[];
  hasRedundancy?: boolean;
};

export type SubnetWithChildren = Subnet & {
  ranges?: RangeWithChildren[];
  fixedAddresses?: FixedAddressWithRedundancy[];
  hasRedundancy?: boolean;
};

export type RangeWithChildren = Range & {
  fixedAddresses?: FixedAddressWithRedundancy[];
  hasRedundancy?: boolean;
};

export type FixedAddressWithRedundancy = FixedAddress & {
  hasRedundancy?: boolean;
};
