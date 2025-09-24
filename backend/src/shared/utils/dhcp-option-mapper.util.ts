import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';

interface CspDhcpOptionLike {
  group?: string | null;
  option_code: string;
  option_value: string;
  type: string;
}

/**
 * Builds a map of option codes using both externalId and numeric code as keys.
 */
export function buildOptionCodeMap(
  allOptionCodes: OptionCodeEntity[],
): Map<string, OptionCodeEntity> {
  const map = new Map<string, OptionCodeEntity>();
  for (const code of allOptionCodes) {
    if (code.externalId) map.set(code.externalId, code);
    if (code.code !== undefined && code.code !== null) {
      map.set(String(code.code), code);
    }
  }
  return map;
}

/**
 * Maps a raw DHCP option DTO to a partial database entity,
 * resolving OptionCode and OptionSpace references when available.
 */
export function mapDhcpOptionToEntity<T extends object>(
  opt: CspDhcpOptionLike,
  optionCodeMap: Map<string, OptionCodeEntity>,
): Partial<T> {
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
