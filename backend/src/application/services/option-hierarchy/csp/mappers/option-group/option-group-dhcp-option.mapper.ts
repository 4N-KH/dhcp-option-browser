/*
import { OptionGroupDhcpOptionDto } from '@/domain/dto/csp/dhcp-tree.dto';
import { OptionGroupDhcpOption } from '@/infrastructure/database/csp/option-group-dhcp-option.entity';

export function mapOptionGroupDhcpOptionToDto(
  opt: OptionGroupDhcpOption,
  groupSource: string,
): OptionGroupDhcpOptionDto {
  const optionCode = opt.optionCode;
  const optionSpace = optionCode?.optionSpace;
  return {
    id: opt.id,
    optionCodeId: optionCode?.id ?? opt.optionCodeId,
    optionSpaceId: optionSpace?.id ?? opt.optionSpaceId ?? null,
    option_value: opt.option_value,
    code: optionCode?.code ?? '',
    name: optionCode?.name ?? '',
    type: optionCode?.type ?? '',
    optionSpaceName: optionSpace?.name ?? '',
    optionSpaceProtocol: optionSpace?.protocol ?? '',
    comment: optionCode?.comment ?? '',
    array: !!optionCode?.array,
    source: groupSource,
    // inheritedFrom: [] // Optional, falls gebraucht
  };
}
*/
