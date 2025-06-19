// Macht die Datei sicher zu einem ES-Modul
export {};

export interface CspFixedAddressDto {
  id: string;
  name: string;
  address: string;
  ip_space: string;
  match_type: string;
  match_value: string;

  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  comment?: string;
  parent?: string;
  inheritance_sources?: Record<string, any>;
  [key: string]: any;
}
