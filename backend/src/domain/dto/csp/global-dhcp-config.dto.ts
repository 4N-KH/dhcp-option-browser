export interface CspGlobalDhcpConfigDto {
  comment?: string | null;
  dhcp_options: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  dhcp_options_v6: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
}
