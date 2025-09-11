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

export interface LightSubnetDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment: string | null;
  ranges: LightRangeDto[];
  fixedAddresses?: LightFixedAddressDto[];
}

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

export interface LightIpSpaceDto {
  id: number;
  externalId: string;
  name: string;
  comment: string | null;
  addressBlocks: LightAddressBlockDto[];
  subnets: LightSubnetDto[];
}

export interface LightGlobalDhcpConfigDto {
  id: number;
  comment: string | null;
  ipSpaces: LightIpSpaceDto[];
}

export interface DhcpTreeNode {
  id: number | string;
  name: string;
  children?: DhcpTreeNode[];
}

export type DhcpLightTreeDto = LightGlobalDhcpConfigDto;
