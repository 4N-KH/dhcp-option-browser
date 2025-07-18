import { RangeDhcpOption } from '@/infrastructure/database/csp/range-dhcp-option.entity';
import {
  EffectiveDhcpOptionDto,
  OptionSpaceMetaDto,
} from '@/domain/dto/csp/effective-dhcp-option.dto';
import { extractOptionCodeMeta } from '@/shared/utils/option-code-meta.util';

export function mapRangeDhcpOptionToEffectiveDto(
  opt: RangeDhcpOption,
): EffectiveDhcpOptionDto {
  const meta = extractOptionCodeMeta(opt.optionCode);

  const optionSpace: OptionSpaceMetaDto | undefined = meta.optionSpace
    ? {
        id: meta.optionSpace.id,
        name: meta.optionSpace.name,
        protocol: meta.optionSpace.protocol ?? '',
        comment: meta.optionSpace.comment ?? null,
        createdAt: meta.optionSpace.createdAt ?? null,
        updatedAt: meta.optionSpace.updatedAt ?? null,
      }
    : undefined;

  return {
    code: meta.code,
    name: meta.name,
    type: meta.type,
    value: opt.option_value,
    optionSpace,
    sourceLevel: 'range',
    sourceId: opt.rangeId,
    isExplicit: true,
    isInherited: false,
    isOverridden: false,
    overriddenBy: undefined,
    comment: meta.comment ?? null,
    array: meta.array ?? null,
    createdAt: meta.createdAt ?? null,
    updatedAt: meta.updatedAt ?? null,
  };
}
