export interface CspAddressBlockDto {
  id: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string | null;
  parent?: string | null;
  space?: string | null;
  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
}
