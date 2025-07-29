import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { ContextObj } from './types/context-obj.type';
import { getOriginLevelLabel } from './helpers/get-origin-label';

type PlainObject = Record<string, unknown>;

function isPlainObject(obj: unknown): obj is PlainObject {
  return typeof obj === 'object' && obj !== null;
}
function getString(obj: PlainObject, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}
function getNumber(obj: PlainObject, key: string): number | undefined {
  const v = obj[key];
  return typeof v === 'number' ? v : undefined;
}
function getNullableString(
  obj: PlainObject,
  key: string,
): string | null | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : v === null ? null : undefined;
}
function getBoolean(obj: PlainObject, key: string): boolean | undefined {
  const v = obj[key];
  return typeof v === 'boolean' ? v : undefined;
}
function getObject(
  obj: PlainObject,
  key: string,
): PlainObject | null | undefined {
  const v = obj[key];
  return typeof v === 'object' && v !== null
    ? (v as PlainObject)
    : v === null
      ? null
      : undefined;
}

interface RedundancyMarking {
  redundant?: boolean;
}
function hasRedundancyMarking(opt: unknown): opt is RedundancyMarking {
  return isPlainObject(opt) && 'redundant' in opt;
}

export type GroupOptionDto = {
  code: string;
  name?: string;
  value: string | null;
  type?: string | null;
  array?: boolean | null;
  optionCodeComment?: string | null;
  optionCodeSource?: string | null;
  optionSpace?: any;
  level: ObjectType;
  levelId: number;
  groupId?: number;
  groupName?: string;
  redundant?: boolean;
};

@Injectable()
export class SlimDtoFactoryService {
  private getOriginLevel(stack: OptionInheritanceStackEntryDto[]) {
    let lastOrigin: { originLevel: string; originLevelId: number } | undefined;
    for (let i = 0; i < stack.length; ++i) {
      const entry = stack[i];
      if (entry.isExplicit) {
        lastOrigin = {
          originLevel: String(entry.level),
          originLevelId: entry.levelId,
        };
      }
    }
    return lastOrigin;
  }

  buildSlimDtoFromStack(
    code: string,
    stack: OptionInheritanceStackEntryDto[],
    contexts?: ContextObj[],
    contextTreeMaps?: {
      globalConfigId?: number;
      ipSpacesById?: Map<number, { name?: string }>;
      addressBlocksById?: Map<
        number,
        { name?: string; address?: string; cidr?: number }
      >;
      subnetsById?: Map<
        number,
        { name?: string; address?: string; cidr?: number }
      >;
      rangesById?: Map<number, { name?: string; start?: string; end?: string }>;
      fixedAddressesById?: Map<number, { name?: string; address?: string }>;
    },
  ): EffectiveDhcpOptionSlimDto {
    const top = stack[stack.length - 1];
    const isInherited = !!top.isInherited;

    const originChain = stack.map((s) => ({
      level: String(s.level),
      levelId: s.levelId,
      type: s.optionGroup
        ? s.isInherited
          ? 'GROUP_INHERITED'
          : 'GROUP_EXPLICIT'
        : ((s.isInherited ? 'INHERITED' : 'EXPLICIT') as
            | 'GROUP_INHERITED'
            | 'GROUP_EXPLICIT'
            | 'INHERITED'
            | 'EXPLICIT'),
      optionGroupId: s.optionGroup?.id,
      optionGroupName: s.optionGroup?.name ?? '',
    }));

    // robust: direkt von der Option übernehmen!
    let redundant = false;
    if (hasRedundancyMarking(top) && top.redundant) {
      redundant = true;
    }

    let originInfo: Partial<EffectiveDhcpOptionSlimDto['source']> = {};
    let originLevelLabel: string | undefined = undefined;
    if (isInherited && stack.some((s) => s.isExplicit)) {
      const firstExplicit = this.getOriginLevel(stack);
      if (firstExplicit) {
        originInfo = {
          originLevel: firstExplicit.originLevel,
          originLevelId: firstExplicit.originLevelId,
        };
        originLevelLabel = getOriginLevelLabel(
          firstExplicit.originLevel,
          firstExplicit.originLevelId,
          contextTreeMaps,
        );
      }
    }

    let optionGroupDetails:
      | EffectiveDhcpOptionSlimDto['source']['optionGroup']
      | undefined;
    if (top.optionGroup && contexts) {
      let groupOptions: GroupOptionDto[] = [];
      for (let k = contexts.length - 1; k >= 0; --k) {
        const ctx = contexts[k];
        const g = ctx.optionGroups.find(
          (gg) => gg.group.id === top.optionGroup!.id && gg.options.length > 0,
        );
        if (g) {
          groupOptions = g.options.map((opt) => {
            if (!isPlainObject(opt)) {
              throw new Error('Option must be object');
            }
            const codeStr =
              getString(opt, 'code') ?? getString(opt, 'option_code') ?? '';
            const name = getString(opt, 'name');
            const value =
              getNullableString(opt, 'value') ??
              getNullableString(opt, 'option_value') ??
              null;
            const type = getString(opt, 'type') ?? null;
            const array = getBoolean(opt, 'array') ?? null;
            const optionCodeComment =
              getString(opt, 'optionCodeComment') ?? null;
            const optionCodeSource = getString(opt, 'optionCodeSource') ?? null;
            const optionSpace = getObject(opt, 'optionSpace') ?? null;

            // <- Das redundant-Flag immer 1:1 übernehmen!
            const isRedundant =
              hasRedundancyMarking(opt) && opt.redundant === true;

            return {
              code: codeStr,
              name,
              value,
              type,
              array,
              optionCodeComment,
              optionCodeSource,
              optionSpace,
              level: ctx.level,
              levelId: ctx.levelId,
              groupId: g.group.id,
              groupName: g.group.name ?? '',
              ...(isRedundant ? { redundant: true } : {}),
            };
          });
          break;
        }
      }
      optionGroupDetails = {
        id: top.optionGroup.id,
        name: top.optionGroup.name ?? '',
        comment: top.optionGroup.comment ?? null,
        options: groupOptions,
        groupInheritanceType: top.isInherited
          ? 'GROUP_INHERITED'
          : 'GROUP_EXPLICIT',
        isGroupInherited: top.isInherited,
        groupOriginLevel:
          isInherited && stack.some((s) => s.isExplicit)
            ? (originInfo.originLevel as string)
            : String(top.level),
        groupOriginLevelId:
          isInherited && stack.some((s) => s.isExplicit)
            ? (originInfo.originLevelId as number)
            : top.levelId,
        originLevelLabel: originLevelLabel,
      };
    }

    let overridden: EffectiveDhcpOptionSlimDto['overridden'] | undefined =
      undefined;
    if (stack.length > 1 && !isInherited && top.isExplicit) {
      for (let i = stack.length - 2; i >= 0; --i) {
        const candidate = stack[i];
        if (candidate.isExplicit && candidate.isOverridden) {
          overridden = {
            level: String(candidate.level),
            levelId: candidate.levelId,
            value: candidate.value,
            ...(candidate.optionGroup
              ? {
                  optionGroup: {
                    id: candidate.optionGroup.id,
                    name: candidate.optionGroup.name ?? '',
                    comment: candidate.optionGroup.comment ?? null,
                  },
                }
              : {}),
          };
          break;
        }
      }
    }

    const topObj = isPlainObject(top) ? top : {};
    const name = getString(topObj, 'name');
    const effectiveValue = getNullableString(topObj, 'value');
    const type = getString(topObj, 'type') ?? null;
    const array = getBoolean(topObj, 'array') ?? null;
    const optionCodeComment = getString(topObj, 'optionCodeComment') ?? null;
    const optionCodeSource = getString(topObj, 'optionCodeSource') ?? null;
    const optionSpaceObj = getObject(topObj, 'optionSpace');
    const optionSpace = optionSpaceObj
      ? {
          id: getNumber(optionSpaceObj, 'id') ?? 0,
          name: getString(optionSpaceObj, 'name') ?? '',
          protocol: getString(optionSpaceObj, 'protocol') ?? null,
        }
      : null;
    const comment = getNullableString(topObj, 'comment') ?? null;
    const createdAt = getString(topObj, 'createdAt') ?? null;
    const updatedAt = getString(topObj, 'updatedAt') ?? null;

    return {
      code: code,
      name,
      effectiveValue: effectiveValue ?? null,
      type,
      array,
      optionCodeComment,
      optionCodeSource,
      optionSpace,
      source: {
        level: String(top.level),
        levelId: top.levelId,
        type: top.optionGroup
          ? top.isInherited
            ? 'GROUP_INHERITED'
            : 'GROUP_EXPLICIT'
          : top.isInherited
            ? 'INHERITED'
            : 'EXPLICIT',
        ...(optionGroupDetails ? { optionGroup: optionGroupDetails } : {}),
        ...(originInfo ? originInfo : {}),
        ...(originLevelLabel ? { originLevelLabel } : {}),
      },
      ...(overridden ? { overridden } : {}),
      comment,
      createdAt,
      updatedAt,
      inheritanceType: top.optionGroup
        ? top.isInherited
          ? 'GROUP_INHERITED'
          : 'GROUP_EXPLICIT'
        : top.isInherited
          ? 'INHERITED'
          : 'EXPLICIT',
      isInherited: isInherited,
      isOverridden: !!top.isOverridden,
      originChain,
      ...(redundant ? { redundant: true } : {}),
    };
  }

  buildSlimDtoForAll(
    stacks: Map<string, OptionInheritanceStackEntryDto[]>,
    contexts: ContextObj[],
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >,
    contextTreeMaps?: {
      globalConfigId?: number;
      ipSpacesById?: Map<number, { name?: string }>;
      addressBlocksById?: Map<
        number,
        { name?: string; address?: string; cidr?: number }
      >;
      subnetsById?: Map<
        number,
        { name?: string; address?: string; cidr?: number }
      >;
      rangesById?: Map<number, { name?: string; start?: string; end?: string }>;
      fixedAddressesById?: Map<number, { name?: string; address?: string }>;
    },
  ): EffectiveDhcpOptionSlimDto[] {
    const dtos: EffectiveDhcpOptionSlimDto[] = [];
    for (const [code, stack] of stacks.entries()) {
      const dto = this.buildSlimDtoFromStack(
        code,
        stack,
        contexts,
        contextTreeMaps,
      );
      dtos.push(dto);
    }
    const lastContext = contexts[contexts.length - 1];
    for (const { group, ctxIdx } of allGroups.values()) {
      const already = dtos.some(
        (dto) =>
          dto.source?.optionGroup &&
          dto.source.optionGroup.id === group.id &&
          dto.source.level === String(lastContext.level) &&
          dto.source.levelId === lastContext.levelId,
      );
      if (!already) {
        const isExplicit = ctxIdx === contexts.length - 1;
        const type: 'GROUP_EXPLICIT' | 'GROUP_INHERITED' = isExplicit
          ? 'GROUP_EXPLICIT'
          : 'GROUP_INHERITED';
        let groupOptions: GroupOptionDto[] = [];
        for (let i = ctxIdx; i >= 0; --i) {
          const ctx = contexts[i];
          const g = ctx.optionGroups.find(
            (og) => og.group.id === group.id && og.options.length > 0,
          );
          if (g) {
            groupOptions = g.options.map((opt): GroupOptionDto => {
              if (!isPlainObject(opt)) throw new Error('Option must be object');
              const codeStr =
                getString(opt, 'code') ?? getString(opt, 'option_code') ?? '';
              const name = getString(opt, 'name');
              const value =
                getNullableString(opt, 'value') ??
                getNullableString(opt, 'option_value') ??
                null;
              const typeVal = getString(opt, 'type') ?? null;
              const array = getBoolean(opt, 'array') ?? null;
              const optionCodeComment =
                getString(opt, 'optionCodeComment') ?? null;
              const optionCodeSource =
                getString(opt, 'optionCodeSource') ?? null;
              const optionSpace = getObject(opt, 'optionSpace') ?? null;

              // <- Das redundant-Flag immer 1:1 übernehmen!
              const isRedundant =
                hasRedundancyMarking(opt) && opt.redundant === true;

              return {
                code: codeStr,
                name,
                value,
                type: typeVal,
                array,
                optionCodeComment,
                optionCodeSource,
                optionSpace,
                level: ctx.level,
                levelId: ctx.levelId,
                groupId: g.group.id,
                groupName: g.group.name ?? '',
                ...(isRedundant ? { redundant: true } : {}),
              };
            });
            break;
          }
        }
        const originLevel: ObjectType = !isExplicit
          ? contexts[ctxIdx].level
          : lastContext.level;
        const originLevelId = !isExplicit
          ? contexts[ctxIdx].levelId
          : lastContext.levelId;
        const originLevelLabel = getOriginLevelLabel(
          String(originLevel),
          originLevelId,
          contextTreeMaps,
        );
        const groupDto: EffectiveDhcpOptionSlimDto = {
          code: '',
          name: undefined,
          effectiveValue: null,
          type: undefined,
          array: undefined,
          optionCodeComment: undefined,
          optionCodeSource: undefined,
          optionSpace: undefined,
          source: {
            level: String(lastContext.level),
            levelId: lastContext.levelId,
            type,
            optionGroup: {
              id: group.id,
              name: group.name ?? '',
              comment: group.comment ?? null,
              options: groupOptions,
              groupInheritanceType: type,
              isGroupInherited: !isExplicit,
              groupOriginLevel: String(originLevel),
              groupOriginLevelId: originLevelId,
              originLevelLabel: originLevelLabel,
            },
          },
          overridden: undefined,
          comment: null,
          createdAt: null,
          updatedAt: null,
          inheritanceType: type,
          isInherited: !isExplicit,
          isOverridden: false,
          originChain: [
            {
              level: String(contexts[ctxIdx].level),
              levelId: contexts[ctxIdx].levelId,
              type,
              optionGroupId: group.id,
              optionGroupName: group.name ?? '',
            },
            {
              level: String(lastContext.level),
              levelId: lastContext.levelId,
              type,
              optionGroupId: group.id,
              optionGroupName: group.name ?? '',
            },
          ],
        };
        dtos.push(groupDto);
      }
    }
    return dtos;
  }
}
