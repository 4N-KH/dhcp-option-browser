export interface CspSubnetDto {
  id: string;
  name: string;
  address: string;
  cidr: number;
  parent?: string | null;
  space?: string | null;
  comment?: string | null;
  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  // Falls "option_group" in API vorkommt, ergänze:
  option_group?: string | null;
}
