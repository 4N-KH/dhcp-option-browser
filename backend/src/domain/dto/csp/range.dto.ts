export interface CspRangeDto {
  id: string;
  name: string;
  start: string;
  end: string;
  parent?: string;
  space?: string;
  comment?: string;

  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  exclusion_ranges?: {
    start: string;
    end: string;
    comment?: string;
  }[];

  inheritance_sources?: Record<string, any>;

  [key: string]: any;
}
