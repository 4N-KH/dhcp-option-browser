export interface CspAddressBlockDto {
  id: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string;
  parent?: string;
  space?: string;
  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  [key: string]: any; // open for future/edge fields
}
