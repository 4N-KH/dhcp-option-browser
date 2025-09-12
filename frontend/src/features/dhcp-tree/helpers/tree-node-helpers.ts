import {
  DhcpLightTreeDto,
  LightIpSpaceDto,
  LightAddressBlockDto,
  LightSubnetDto,
  LightRangeDto,
  LightFixedAddressDto,
} from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection } from "../../../types/types";

// Default selection: root node (global config)
export function getDefaultSelection(tree: DhcpLightTreeDto): TreeSelection {
  return { type: "global", object: tree };
}

// Recursively collects children of a node
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
      // Return both address blocks and direct subnets
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
      // Return nested blocks and subnets
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
      const children: TreeSelection[] = [];
      // Include ranges if present
      if (subnet.ranges) {
        children.push(
          ...subnet.ranges.map((range) => ({
            type: "range" as const,
            object: range,
          })),
        );
      }
      // Include fixed addresses if explicitly listed
      if (
        Array.isArray(subnet.fixedAddresses) &&
        subnet.fixedAddresses.length > 0
      ) {
        children.push(
          ...subnet.fixedAddresses.map((fa) => ({
            type: "fixedAddress" as const,
            object: fa,
          })),
        );
      }
      return children;
    }
    case "range": {
      const range = object as LightRangeDto;
      // Ranges only contain fixed addresses
      return range.fixedAddresses.map((fa) => ({
        type: "fixedAddress" as const,
        object: fa,
      }));
    }
    // fixedAddress is a leaf node
    default:
      return [];
  }
}

// Returns display label for each node (used in UI)
export function getNodeLabel(selection: TreeSelection): string {
  const { type, object } = selection;

  if (type === "global") return "Global DHCP Configuration";
  if (type === "ipSpace")
    return (object as LightIpSpaceDto).name?.trim() || "IP Space";
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
