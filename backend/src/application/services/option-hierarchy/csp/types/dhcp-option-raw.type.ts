import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpaceMetaDto } from '@/domain/dto/csp/option-space-meta.dto';

/**
 * Rohdaten eines DHCP-Options-Eintrags, wie aus der DB/API geholt.
 * Für Mapping und Assembler:
 * - `option_value` ist das Hauptfeld für den eigentlichen Wert (string/null)
 * - optional kann auch `value` existieren (Legacy, je nach Quelle/Mapping)
 */
export interface DhcpOptionRaw {
  option_code: string;
  option_value: string | null;
  value?: string | null;

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
  code?: string | null;
  externalId?: string | null;
}
