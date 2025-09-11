import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';

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
            // Normale Option
            ((typeof opt.option_code === 'string' &&
              typeof opt.option_value === 'string' &&
              typeof opt.type === 'string') ||
              // Group-Referenz: group gesetzt UND type ist "group"
              (opt.type === 'group' && typeof opt.group === 'string')),
        )
        .map((opt) => ({
          group: opt.group ?? undefined,
          option_code:
            typeof opt.option_code === 'string' ? opt.option_code : '',
          option_value:
            typeof opt.option_value === 'string' ? opt.option_value : '',
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
