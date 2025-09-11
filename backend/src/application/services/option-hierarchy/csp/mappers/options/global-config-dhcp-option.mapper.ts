import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { extractOptionCodeMeta } from '@/shared/utils/option-code-meta.util';
import {
  EffectiveDhcpOptionDto,
  OptionSpaceMetaDto,
} from '@/domain/dto/csp/effective-dhcp-option.dto';

export function mapGlobalConfigDhcpOptionToEffectiveDto(
  opt: DhcpGlobalConfigOption,
): EffectiveDhcpOptionDto {
  const meta = extractOptionCodeMeta(opt.optionCode);

  const optionSpace: OptionSpaceMetaDto | undefined = meta.optionSpace
    ? {
        id: meta.optionSpace.id,
        name: meta.optionSpace.name,
        protocol: meta.optionSpace.protocol ?? '', // <- garantiert immer string!
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
    sourceLevel: 'globalConfig',
    sourceId: opt.globalConfigId,
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
