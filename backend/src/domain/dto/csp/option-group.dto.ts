export interface CspOptionGroupDto {
  id: string;
  name: string;
  comment?: string | null;
  protocol?: string | null;

  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
}
