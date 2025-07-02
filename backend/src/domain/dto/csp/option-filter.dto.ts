export interface CspOptionFilterDto {
  id: string;
  name: string;
  comment?: string | null;
  protocol?: string | null;
  role?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  lease_time?: number | null;

  header_option_filename?: string | null;
  header_option_server_address?: string | null;
  header_option_server_name?: string | null;

  vendor_specific_option_option_space?: string | null;

  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  rules?: {
    match: string;
    rules: {
      compare: string;
      option_code: string;
      option_value: string;
      substring_offset: number;
    }[];
  };

  tags?: Record<string, unknown>;
}
