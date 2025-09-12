import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { extractOptionCodeMeta } from '@/shared/utils/option-code-meta.util';
import {
  EffectiveDhcpOptionDto,
  OptionSpaceMetaDto,
} from '@/domain/dto/csp/effective-dhcp-option.dto';

export function mapIpSpaceDhcpOptionToEffectiveDto(
  opt: IpSpaceDhcpOption,
): EffectiveDhcpOptionDto {
  const meta = extractOptionCodeMeta(opt.optionCode);

  const optionSpace: OptionSpaceMetaDto | undefined = meta.optionSpace
    ? {
        id: meta.optionSpace.id,
        name: meta.optionSpace.name,
        protocol: meta.optionSpace.protocol ?? '', // Immer ein String!
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
    optionSpace: optionSpace,
    sourceLevel: 'ipSpace',
    sourceId: opt.ipSpaceId,
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
