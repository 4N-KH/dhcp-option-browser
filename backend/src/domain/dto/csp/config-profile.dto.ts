// src/domain/dto/csp/config-profile.dto.ts

export interface CspConfigProfileDto {
  id: string;
  name: string;
  comment?: string;

  // DHCP options assigned at the profile level
  dhcp_options?: {
    group?: string;
    option_code: string;
    option_value: string;
    type: string;
  }[];

  // Reserved for future inheritance or mapping purposes
  // may be utilised for meta fields or advanced inheritance logic
  inheritance_sources?: Record<string, any>;

  // Open for vendor-specific extensions or special cases
  // (requirement for flexibility based on analysis)
  [key: string]: any;
}
