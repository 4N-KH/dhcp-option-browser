import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';

interface CspDhcpOptionLike {
  group?: string | null;
  option_code: string;
  option_value: string;
  type: string;
}

/**
 * Baut die Maps für OptionCodes und OptionSpaces analog zum AddressBlock-Import (mit beiden Schlüsseln!)
 */
export function buildOptionCodeMap(
  allOptionCodes: OptionCodeEntity[],
): Map<string, OptionCodeEntity> {
  const map = new Map<string, OptionCodeEntity>();
  for (const code of allOptionCodes) {
    if (code.externalId) map.set(code.externalId, code);
    if (code.code !== undefined && code.code !== null)
      map.set(String(code.code), code);
  }
  return map;
}

/**
 * Universelle Hilfsfunktion für das Mapping von DTOs auf DB-Optionen.
 * Gibt ein Objekt mit allen benötigten Feldern zurück (inkl. OptionSpace und OptionSpaceId).
 */
export function mapDhcpOptionToEntity<T extends object>(
  opt: CspDhcpOptionLike,
  optionCodeMap: Map<string, OptionCodeEntity>,
): Partial<T> {
  // Finde OptionCode-Referenz (über code und externalId)
  const optionCodeRef =
    optionCodeMap.get(opt.option_code) ??
    optionCodeMap.get(String(opt.option_code)) ??
    undefined;
  const optionSpaceRef: OptionSpace | undefined = optionCodeRef?.optionSpace;
  const optionSpaceId = optionSpaceRef?.id ?? undefined;

  return {
    group: typeof opt.group === 'string' ? opt.group : null,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCode: optionCodeRef,
    optionCodeId: optionCodeRef?.id,
    optionSpace: optionSpaceRef,
    optionSpaceId: optionSpaceId,
  } as unknown as Partial<T>;
}
