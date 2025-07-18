import {
  DhcpLightTreeDto,
  LightIpSpaceDto,
  LightAddressBlockDto,
  LightSubnetDto,
  LightRangeDto,
  LightFixedAddressDto,
} from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection } from "./types";

// Initial selection for root node
export function getDefaultSelection(tree: DhcpLightTreeDto): TreeSelection {
  return { type: "global", object: tree };
}

// Returns all children as TreeSelection[] for the given object (recursively)
export function getChildren(selection: TreeSelection): TreeSelection[] {
  const { type, object } = selection;
  switch (type) {
    case "global": {
      const tree = object as DhcpLightTreeDto;
      return tree.ipSpaces.map((ipSpace) => ({
        type: "ipSpace" as const,
        object: ipSpace,
      }));
    }
    case "ipSpace": {
      const ipSpace = object as LightIpSpaceDto;
      return [
        ...ipSpace.addressBlocks.map((block) => ({
          type: "addressBlock" as const,
          object: block,
        })),
        ...ipSpace.subnets.map((sn) => ({
          type: "subnet" as const,
          object: sn,
        })),
      ];
    }
    case "addressBlock": {
      const block = object as LightAddressBlockDto;
      return [
        ...block.children.map((child) => ({
          type: "addressBlock" as const,
          object: child,
        })),
        ...block.subnets.map((sn) => ({
          type: "subnet" as const,
          object: sn,
        })),
      ];
    }
    case "subnet": {
      const subnet = object as LightSubnetDto;
      // Support both ranges and (optional) direct fixed addresses
      const children: TreeSelection[] = [];
      if (subnet.ranges) {
        children.push(
          ...subnet.ranges.map((range) => ({
            type: "range" as const,
            object: range,
          }))
        );
      }
      if (Array.isArray(subnet.fixedAddresses) && subnet.fixedAddresses.length > 0) {
        children.push(
          ...subnet.fixedAddresses.map((fa) => ({
            type: "fixedAddress" as const,
            object: fa,
          }))
        );
      }
      return children;
    }
    case "range": {
      const range = object as LightRangeDto;
      return range.fixedAddresses.map((fa) => ({
        type: "fixedAddress" as const,
        object: fa,
      }));
    }
    // fixedAddress: leaf node, no children
    default:
      return [];
  }
}

// Liefert den sichtbaren Label-Text für jeden Tree-Knoten (UX only)
export function getNodeLabel(selection: TreeSelection): string {
  const { type, object } = selection;

  if (type === "global") return "Global DHCP Configuration";
  if (type === "ipSpace") return (object as LightIpSpaceDto).name?.trim() || "IP Space";
  if (type === "addressBlock") {
    const block = object as LightAddressBlockDto;
    if (block.name?.trim()) return block.name;
    if (block.address && typeof block.cidr === "number")
      return `${block.address}/${block.cidr}`;
    return "Address Block";
  }
  if (type === "subnet") {
    const subnet = object as LightSubnetDto;
    if (subnet.name?.trim()) return subnet.name;
    if (subnet.address && typeof subnet.cidr === "number")
      return `${subnet.address}/${subnet.cidr}`;
    return "Subnet";
  }
  if (type === "range") {
    const range = object as LightRangeDto;
    if (range.name?.trim()) return range.name;
    if (range.start && range.end) return `${range.start} – ${range.end}`;
    return "Range";
  }
  if (type === "fixedAddress") {
    const fa = object as LightFixedAddressDto;
    if (fa.name?.trim()) return fa.name;
    if (fa.ip) return fa.ip;
    return "Fixed Address";
  }
  return type;
}
