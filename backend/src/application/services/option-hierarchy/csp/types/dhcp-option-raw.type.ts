// src/application/services/option-hierarchy/csp/types/dhcp-option-raw.type.ts
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpaceMetaDto } from '@/domain/dto/csp/option-space-meta.dto';

/**
 * Rohdaten eines DHCP-Options-Eintrags, wie aus der DB/API geholt.
 * Für Mapping und Assembler:
 * - `option_value` ist das Hauptfeld für den eigentlichen Wert (string/null)
 * - optional kann auch `value` existieren (Legacy, je nach Quelle/Mapping)
 */
export interface DhcpOptionRaw {
  option_code: string; // Immer befüllt, Infoblox/UUID
  option_value: string | null; // Hauptwert, immer vorhanden (auch wenn null)
  value?: string | null; // Alternativ für Legacy/andere Quellen

  type?: string | null;
  array?: boolean | null;
  comment?: string | null;
  name?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  optionCode?: OptionCodeEntity | null;
  optionSpace?: OptionSpaceMetaDto | null;
  optionCodeSource?: string | null;
  optionCodeComment?: string | null;
  code?: string | null; // immer numerisch, falls möglich!
  externalId?: string | null; // UUID, falls gebraucht
}
