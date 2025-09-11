import {
  LightGlobalDhcpConfigDto,
  LightIpSpaceDto,
  LightAddressBlockDto,
  LightSubnetDto,
  LightRangeDto,
  LightFixedAddressDto,
} from "@/types/dto/dhcp-light-tree.dto";

export type DhcpLightObject =
  | LightGlobalDhcpConfigDto
  | LightIpSpaceDto
  | LightAddressBlockDto
  | LightSubnetDto
  | LightRangeDto
  | LightFixedAddressDto;

export type DhcpObjectType =
  | "global"
  | "ipSpace"
  | "addressBlock"
  | "subnet"
  | "range"
  | "fixedAddress";

export interface TreeSelection {
  type: DhcpObjectType;
  object: DhcpLightObject;
}
