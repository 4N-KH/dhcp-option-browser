export interface CspIpSpaceDto {
  id: string;
  name: string;
  comment?: string | null;
  dhcp_options: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
}
