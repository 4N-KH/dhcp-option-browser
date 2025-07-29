export interface OptionOccurrenceDto {
  objectType: string;             // z. B. "ipSpace", "subnet", "addressBlock", etc.
  objectId: number;
  objectLabel: string;
  objectDisplay: string;          // Ergonomisch: z. B. "Subnetz X (192.168.1.0/24)"
  address?: string | null;        // Adresse oder Start-IP
  cidr?: string | null;           // CIDR oder Bereich, IMMER als String
  ipSpace?: string | null;        // Name des zugehörigen IP Spaces (falls vorhanden)
  value: string | null;
  setStatus: "explicit" | "inherited" | "overridden";
  type?: string | null;           // Optionstyp (z. B. string, ip-address)
  source?: string | null;         // Ursprungsquelle (z. B. OptionGroup, GlobalConfig etc.)

  // Für künftige Vererbungs-/Überschreibungsanzeigen (Objektdetails auf Herkunft/Ziel)
  inheritedFrom?: {
    objectType: string;
    objectId: number;
    objectLabel: string;
    objectDisplay?: string;
    address?: string | null;
    cidr?: string | null;
  } | null;

  overriddenBy?: {
    objectType: string;
    objectId: number;
    objectLabel: string;
    objectDisplay?: string;
    address?: string | null;
    cidr?: string | null;
  } | null;

  // Kontext-IDs, falls du z. B. aus der Tabelle direkt in die OptionSpace/OptionCode springen willst
  optionSpaceId?: number | null;
  optionCodeId?: number | null;
}
