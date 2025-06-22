export interface CspRangeDto {
  id: string;
  name: string;
  start: string;
  end: string;
  parent?: string | null;
  space?: string | null;
  comment?: string | null;
  dhcp_options?: {
    group?: string | null;
    option_code: string;
    option_value: string;
    type: string;
  }[];
  exclusion_ranges?: {
    start: string;
    end: string;
    comment?: string | null;
  }[];
  inheritance_sources?: Record<string, any>;
}
