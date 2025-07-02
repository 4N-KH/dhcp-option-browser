// backend/src/shared/parser/normalize-address-block-dtos.ts

import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';

/**
 * Filtert und normalisiert AddressBlock-Daten für CSP (maximale Typ-Sicherheit vor Zod).
 */
export function normalizeAddressBlockDtos(
  input: unknown,
): CspAddressBlockDto[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw) => {
    const dto = raw as Partial<CspAddressBlockDto>;

    let dhcp_options: CspAddressBlockDto['dhcp_options'] = undefined;
    if (Array.isArray(dto.dhcp_options)) {
      dhcp_options = dto.dhcp_options
        .filter(
          (
            opt,
          ): opt is {
            group?: string | null;
            option_code: string;
            option_value: string;
            type: string;
          } =>
            !!opt &&
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string' &&
            (typeof opt.group === 'string' ||
              typeof opt.group === 'undefined' ||
              opt.group === null),
        )
        .map((opt) => ({
          group: opt.group ?? undefined,
          option_code: opt.option_code,
          option_value: opt.option_value,
          type: opt.type,
        }));
    }

    return {
      id: String(dto.id ?? ''),
      name: String(dto.name ?? ''),
      address: String(dto.address ?? ''),
      cidr: typeof dto.cidr === 'number' ? dto.cidr : 0,
      comment: typeof dto.comment === 'string' ? dto.comment : null,
      parent: typeof dto.parent === 'string' ? dto.parent : null,
      space: typeof dto.space === 'string' ? dto.space : null,
      dhcp_options,
    };
  });
}
