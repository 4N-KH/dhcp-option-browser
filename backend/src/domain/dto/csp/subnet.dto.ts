// backend/src/domain/dto/csp/subnet.dto.ts
export interface CspSubnetDto {
  id: string;
  name: string;
  cidr: string;
  space: string;
  comment?: string;
  parent?: string;
  dhcp_options?: Record<string, any>;
  option_group?: {
    id: string;
    name: string;
  };
}
