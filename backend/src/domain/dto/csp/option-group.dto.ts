export interface CspOptionGroupDto {
  id: string;
  name: string;

  dhcp_options: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  comment?: string;
  protocol?: string;

  [key: string]: any;
}
