// src/application/services/option-hierarchy/csp/dhcp-option-raw.mapper.ts
import { Injectable } from '@nestjs/common';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { DhcpOptionRaw } from './types/dhcp-option-raw.type';

@Injectable()
export class DhcpOptionRawMapper {
  map(o: {
    option_code: string;
    option_value: string | null;
    type?: string | null;
    optionCode?: OptionCodeEntity | null;
  }): DhcpOptionRaw {
    return {
      code: o.optionCode?.code ?? o.option_code ?? null,
      externalId: o.optionCode?.externalId ?? o.option_code ?? null,
      option_code: o.option_code,
      option_value: o.option_value,
      type: o.type ?? o.optionCode?.type ?? null,
      array: o.optionCode?.array ?? null,
      comment: o.optionCode?.comment ?? null,
      name: o.optionCode?.name ?? null,
      createdAt: o.optionCode?.createdAt ?? null,
      updatedAt: o.optionCode?.updatedAt ?? null,
      optionCodeSource: o.optionCode?.source ?? null,
      optionCodeComment: o.optionCode?.comment ?? null,
      optionSpace: o.optionCode?.optionSpace
        ? {
            id: o.optionCode.optionSpace.id,
            name: o.optionCode.optionSpace.name,
            protocol: o.optionCode.optionSpace.protocol ?? '',
            comment: o.optionCode.optionSpace.comment ?? null,
            createdAt: o.optionCode.optionSpace.createdAt ?? null,
            updatedAt: o.optionCode.optionSpace.updatedAt ?? null,
          }
        : null,
    };
  }
}
