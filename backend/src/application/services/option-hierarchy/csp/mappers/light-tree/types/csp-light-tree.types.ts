import {
  IpSpace,
  AddressBlock,
  Subnet,
  Range,
  FixedAddress,
} from '@/infrastructure/database/csp';

/** IpSpace with AddressBlocks & Subnets */
export type IpSpaceWithChildren = IpSpace & {
  addressBlocks?: AddressBlockWithChildren[];
  subnets?: SubnetWithChildren[];
};

/** AddressBlock with Child-Blocks & Subnets */
export type AddressBlockWithChildren = AddressBlock & {
  children?: AddressBlockWithChildren[];
  subnets?: SubnetWithChildren[];
};

/** Subnet with Ranges AND direct FixedAddresses (without Range) */
export type SubnetWithChildren = Subnet & {
  ranges?: RangeWithChildren[];
  fixedAddresses?: FixedAddress[];
};

/** Range with FixedAddresses */
export type RangeWithChildren = Range & {
  fixedAddresses?: FixedAddress[];
};
