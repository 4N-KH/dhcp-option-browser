// shared/types/dhcp-entities.ts
export interface IpSpaceEntity {
  id: number;
  name: string; // <- niemals optional! sonst mapping error!
  comment?: string;
}
export interface AddressBlockEntity {
  id: number;
  name?: string;
  address?: string;
  cidr?: number;
  comment?: string;
}
export interface SubnetEntity {
  id: number;
  name?: string;
  address?: string;
  cidr?: number;
  comment?: string;
}
export interface RangeEntity {
  id: number;
  name?: string;
  start?: string;
  end?: string;
  comment?: string;
}
export interface FixedAddressEntity {
  id: number;
  name?: string;
  address?: string;
  comment?: string;
}

export type EntityMaps = {
  ipSpacesById: Map<number, IpSpaceEntity>;
  addressBlocksById: Map<number, AddressBlockEntity>;
  subnetsById: Map<number, SubnetEntity>;
  rangesById: Map<number, RangeEntity>;
  fixedAddressesById: Map<number, FixedAddressEntity>;
};
