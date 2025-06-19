export interface CspOptionSpaceDto {
  id: string;
  name: string;
  comment?: string;

  // Option Space type (e.g., vendor-specific, standard)
  type?: string;

  // Optional: vendor association (useful for custom/vendor option spaces)
  vendor?: string;

  // Option Codes belonging to this Option Space
  option_codes?: string[];

  created_at?: string;
  updated_at?: string;

  [key: string]: any;
}
