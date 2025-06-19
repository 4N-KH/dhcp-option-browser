// src/domain/dto/csp/ip-space.dto.ts

export interface CspIpSpaceDto {
  id: string; // Unique identifier for IP Space
  name: string; // Name of the IP Space

  // Optional comment for UI or documentation
  comment?: string;

  // DHCP options set on this IP Space (IPv4 only, for now)
  dhcp_options?: {
    group?: string; // Option group, if assigned
    option_code: string; // Option code (string, per API)
    option_value: string; // Assigned value
    type: string; // Option type
  }[];

  // Keep it open for future special fields (e.g. vendor, OS)
  [key: string]: any;
}
