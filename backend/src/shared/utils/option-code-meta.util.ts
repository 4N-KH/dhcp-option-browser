import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';

export function extractOptionCodeMeta(optionCode?: OptionCodeEntity | null) {
  const optionSpace = optionCode?.optionSpace;
  return {
    code: optionCode?.code ?? '',
    name: optionCode?.name ?? '',
    type: optionCode?.type ?? '',
    comment: optionCode?.comment ?? '',
    array: !!optionCode?.array,
    createdAt: optionCode?.createdAt ?? '',
    updatedAt: optionCode?.updatedAt ?? '',
    optionSpace: optionSpace
      ? {
          id: optionSpace.id,
          name: optionSpace.name,
          protocol: optionSpace.protocol,
          comment: optionSpace.comment ?? '',
          createdAt: optionSpace.createdAt ?? '',
          updatedAt: optionSpace.updatedAt ?? '',
        }
      : undefined,
  };
}
