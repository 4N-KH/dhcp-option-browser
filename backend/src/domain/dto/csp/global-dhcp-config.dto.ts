export interface CspGlobalDhcpConfigDto {
  id: string;
  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  dhcp_options_v6?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  comment?: string;
}
