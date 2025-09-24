import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpaceMetaDto } from '@/domain/dto/csp/option-space-meta.dto';

/**
 * Raw data of a DHCP option entry as retrieved from DB/API.
 * For mapping and assembling:
 * - `option_value` is the primary field for the actual value (string/null)
 * - `value` may also exist for legacy sources or mappings
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
