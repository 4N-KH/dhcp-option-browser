import {
  Globe,      // Global config
  Network,    // IP Space
  SquareStack,// Address Block
  GitBranch,  // Subnet
  Server,     // Range
  Computer,   // Fixed Address
} from "lucide-react";
import { DhcpObjectType } from "../../types/types";

export function getIcon(type: DhcpObjectType) {
  switch (type) {
    case "global":
      return <Globe size={16} className="text-blue-500" />;
    case "ipSpace":
      return <Network size={16} className="text-indigo-500" />;
    case "addressBlock":
      return <SquareStack size={15} className="text-green-600" />;
    case "subnet":
      return <GitBranch size={15} className="text-cyan-600" />;
    case "range":
      return <Server size={15} className="text-orange-600" />;
    case "fixedAddress":
      return <Computer size={15} className="text-rose-700" />;
    default:
      return null;
  }
}
