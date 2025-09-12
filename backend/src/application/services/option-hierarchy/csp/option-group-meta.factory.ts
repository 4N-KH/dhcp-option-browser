// src/application/services/option-hierarchy/csp/option-group-meta.factory.ts
import { Injectable } from '@nestjs/common';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionGroupMetaDto } from '@/domain/dto/csp/option-group-meta.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

@Injectable()
export class OptionGroupMetaFactory {
  fromEntity(
    group: OptionGroup,
    originLevel?: ObjectType,
    originLevelId?: number,
    originLevelName?: string,
  ): OptionGroupMetaDto & {
    originLevel?: ObjectType;
    originLevelId?: number;
    originLevelName?: string;
  } {
    return {
      id: group.id,
      externalId: group.externalId ?? null,
      name: group.name ?? null,
      protocol: group.protocol ?? null,
      comment: group.comment ?? null,
      options:
        group.dhcpOptions?.map((ogdo) => ({
          code: ogdo.optionCode?.code ?? '',
          name: ogdo.optionCode?.name ?? '',
          value: ogdo.option_value ?? null,
          type: ogdo.optionCode?.type ?? null,
          array:
            typeof ogdo.optionCode?.array === 'boolean'
              ? ogdo.optionCode.array
              : null,
          optionCodeComment: ogdo.optionCode?.comment ?? null,
          optionCodeSource: ogdo.optionCode?.source ?? null,
          optionSpace: ogdo.optionCode?.optionSpace
            ? {
                id: ogdo.optionCode.optionSpace.id,
                name: ogdo.optionCode.optionSpace.name,
                protocol: ogdo.optionCode.optionSpace.protocol ?? null,
                comment: ogdo.optionCode.optionSpace.comment ?? null,
                createdAt: ogdo.optionCode.optionSpace.createdAt ?? null,
                updatedAt: ogdo.optionCode.optionSpace.updatedAt ?? null,
              }
            : null,
        })) ?? [],
      ...(originLevel
        ? {
            originLevel,
            originLevelId,
            ...(originLevelName !== undefined ? { originLevelName } : {}),
          }
        : {}),
    };
  }
}
