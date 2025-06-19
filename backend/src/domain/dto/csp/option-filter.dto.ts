export interface CspOptionFilterDto {
  id: string;
  name: string;

  // Rules defining when the filter is applied
  rules: {
    match: string;
    rules: {
      compare: string;
      option_code: string;
      option_value: string;
      substring_offset?: number;
    }[];
  };

  // DHCP options to be applied if the filter matches
  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  comment?: string;
  protocol?: string;
  role?: string;
  lease_time?: number;

  created_at?: string;
  updated_at?: string;

  // Header options, vendor-specific fields, etc.
  // included only if required by use case
  header_option_filename?: string;
  header_option_server_address?: string;
  header_option_server_name?: string;
  vendor_specific_option_option_space?: string;

  [key: string]: any;
}
