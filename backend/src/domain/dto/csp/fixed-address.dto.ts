export interface CspFixedAddressDto {
  id: string;
  name: string;
  address: string;
  ip_space: string;
  match_type: string;
  match_value: string;

  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  comment?: string | null;
  parent?: string | null;
  inheritance_sources?: Record<string, any>;
}
