import { ObjectType } from '@/domain/enums/csp/object-type.enum';

export type OptionSetStatus = 'explicit' | 'inherited' | 'overridden';

/**
 * Auftreten einer DHCP-Option auf einem bestimmten Objekt (Subnet, Range, etc.)
 */
export interface OptionOccurrenceDto {
  objectType: ObjectType;
  objectId: number;
  objectLabel: string | null;

  /** Ergonomisches, für das Frontend formatiertes Label */
  objectDisplay: string;

  /** Adresse (z.B. Netzwerk-Adresse, Start-IP, etc.) */
  address?: string | null;
  /** CIDR oder Prefix (z.B. 24) */
  cidr?: string | null;
  /** IP-Space, falls zuordenbar */
  ipSpace?: string | null;

  /** Effektiver Optionswert */
  value: string | null;

  setStatus: OptionSetStatus;

  /** Nur gesetzt bei Vererbung */
  inheritedFrom?: {
    objectType: ObjectType;
    objectId: number;
    objectLabel: string | null;
    address?: string | null;
    cidr?: string | null;
    objectDisplay?: string;
  };
  /** Nur gesetzt bei Überschreibung */
  overriddenBy?: {
    objectType: ObjectType;
    objectId: number;
    objectLabel: string | null;
    address?: string | null;
    cidr?: string | null;
    objectDisplay?: string;
  };
  /** Optionstyp (z.B. string, ip-address, etc.) */
  type?: string | null;
  /** Ursprungsquelle (z.B. OptionGroup, GlobalConfig etc.) */
  source?: string | null;

  /** OptionSpaceId für Kontext */
  optionSpaceId?: number | null;
  /** OptionCodeId für Kontext */
  optionCodeId?: number | null;
}
