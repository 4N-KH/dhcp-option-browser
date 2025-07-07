// --- Global DHCP Configuration (Root-Ebene) ---
export interface GlobalDhcpConfigTreeDto {
  id: number;
  comment?: string | null;
  dhcpOptions: DhcpOptionDto[]; // Alle Optionen, die an der globalen Konfiguration hängen
  optionGroups: OptionGroupDto[]; // Alle Gruppen, die an der globalen Konfiguration hängen
  ipSpaces: IpSpaceTreeDto[]; // Alle untergeordneten IP Spaces
}

// --- IP Space (Top-Level) ---
export interface IpSpaceTreeDto {
  id: number;
  externalId: string;
  name: string;
  comment?: string | null;
  dhcpOptions: DhcpOptionDto[]; // Direkt am IP Space gesetzte Optionen
  optionGroups: OptionGroupDto[]; // Direkt am IP Space zugewiesene Gruppen
  addressBlocks: AddressBlockTreeDto[]; // Alle untergeordneten Address Blocks
  subnets: SubnetTreeDto[]; // Subnets, die direkt dem IP Space untergeordnet sind
}

// --- Address Block (verschachtelbar) ---
export interface AddressBlockTreeDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string | null;
  parentId?: number | null; // Für die Baumstruktur
  ipSpaceId?: number | null;
  dhcpOptions: DhcpOptionDto[]; // Direkt am Block gesetzte Optionen
  optionGroups: OptionGroupDto[]; // Direkt am Block zugewiesene Gruppen
  children: AddressBlockTreeDto[]; // Verschachtelte Address Blocks
  subnets: SubnetTreeDto[]; // Subnets im Address Block
}

// --- Subnet ---
export interface SubnetTreeDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  cidr: number;
  comment?: string | null;
  addressBlockId?: number | null; // Parent (falls im Address Block)
  spaceId?: number | null; // Parent (falls direkt im IP Space)
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  ranges: RangeTreeDto[]; // Alle Ranges im Subnet
  fixedAddresses: FixedAddressDto[]; // Fixed Addresses, die direkt im Subnet liegen
}

// --- Range ---
export interface RangeTreeDto {
  id: number;
  externalId: string;
  name: string;
  start: string;
  end: string;
  comment?: string | null;
  subnetId: number; // Parent Subnet
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
  exclusionRanges: ExclusionRangeDto[]; // Eventuelle Ausschlussbereiche (optional)
  fixedAddresses: FixedAddressDto[]; // Fixed Addresses, die im Range liegen
}

// --- Fixed Address ---
export interface FixedAddressDto {
  id: number;
  externalId: string;
  name: string;
  address: string;
  match_type: string;
  match_value: string;
  comment?: string | null;
  subnetId?: number | null; // Parent
  rangeId?: number | null; // Parent
  dhcpOptions: DhcpOptionDto[];
  optionGroups: OptionGroupDto[];
}

// --- DHCP Option (kann überall hängen) ---
export interface DhcpOptionDto {
  id: number;
  option_code: string;
  option_value: string;
  type: string;
  optionCodeId?: number | null;
  optionSpaceId?: number | null;
}

// --- Option Group (kann überall hängen) ---
export interface OptionGroupDto {
  id: number;
  externalId: string;
  name: string;
  comment?: string | null;
  protocol?: string | null;
}

// --- Exclusion Range (optional bei Range) ---
export interface ExclusionRangeDto {
  id: number;
  start: string;
  end: string;
  comment?: string | null;
}
