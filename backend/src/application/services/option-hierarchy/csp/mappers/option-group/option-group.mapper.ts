/*
import { OptionGroupDto } from '@/domain/dto/csp/dhcp-tree.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { mapOptionGroupDhcpOptionToDto } from './option-group-dhcp-option.mapper';

export function mapOptionGroupToDto(
  og: OptionGroup,
  sourceContext: string = 'optionGroup',
): OptionGroupDto {
  return {
    id: og.id,
    externalId: og.externalId,
    name: og.name,
    comment: og.comment ?? null,
    protocol: og.protocol ?? null,
    options: Array.isArray(og.dhcpOptions)
      ? og.dhcpOptions.map((opt) =>
          mapOptionGroupDhcpOptionToDto(opt, `${sourceContext}:${og.name}`),
        )
      : [],
  };
}
  */
