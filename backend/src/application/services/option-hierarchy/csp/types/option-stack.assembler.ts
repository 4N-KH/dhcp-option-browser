import { Injectable, Logger } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '../option-stack-entry.factory';
import { OptionGroupMetaFactory } from '../option-group-meta.factory';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { DhcpOptionRaw } from './dhcp-option-raw.type';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

// === Hilfsfunktion für sprechende OriginLabels (jetzt vollständig!) ===
function getOriginLevelLabel(
  originLevel: string | undefined,
  originLevelId: number | undefined,
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
    fixedAddressesById?: Map<number, { address?: string; name?: string }>;
  },
): string | undefined {
  if (!originLevel || originLevelId == null) return undefined;
  // GlobalConfig
  if (
    originLevel === 'global' &&
    contextTreeMaps?.globalConfigId === originLevelId
  ) {
    return 'Global DHCP Configuration';
  }
  // IpSpace
  if (originLevel === 'ipSpace' && contextTreeMaps?.ipSpacesById) {
    const ipSpace = contextTreeMaps.ipSpacesById.get(originLevelId);
    return ipSpace?.name
      ? `ipSpace ${ipSpace.name}`
      : `ipSpace #${originLevelId}`;
  }
  // AddressBlock
  if (originLevel === 'addressBlock' && contextTreeMaps?.addressBlocksById) {
    const ab = contextTreeMaps.addressBlocksById.get(originLevelId);
    if (ab?.name && ab.name.trim().length > 0) return ab.name;
    if (ab?.address && ab.cidr != null) return `${ab.address}/${ab.cidr}`;
    return `address block #${originLevelId}`;
  }
  // Subnet
  if (originLevel === 'subnet' && contextTreeMaps?.subnetsById) {
    const sn = contextTreeMaps.subnetsById.get(originLevelId);
    if (sn?.name && sn.name.trim().length > 0) return sn.name;
    if (sn?.address && sn.cidr != null) return `${sn.address}/${sn.cidr}`;
    if (sn?.address) return sn.address;
    return `subnet #${originLevelId}`;
  }
  // Range
  if (originLevel === 'range' && contextTreeMaps?.rangesById) {
    const rg = contextTreeMaps.rangesById.get(originLevelId);
    if (rg?.name && rg.name.trim().length > 0) return rg.name;
    if (rg?.start && rg?.end) return `${rg.start} – ${rg.end}`;
    return `range #${originLevelId}`;
  }
  // FixedAddress
  if (originLevel === 'fixedAddress' && contextTreeMaps?.fixedAddressesById) {
    const fa = contextTreeMaps.fixedAddressesById.get(originLevelId);
    if (fa?.name && fa.name.trim().length > 0) return fa.name;
    if (fa?.address) return fa.address;
    return `fixed address #${originLevelId}`;
  }
  // Fallback
  return `${originLevel} #${originLevelId}`;
}

type ContextObj = {
  level: ObjectType;
  levelId: number;
  options: DhcpOptionRaw[];
  optionGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[];
};

type GroupStatus = {
  group: OptionGroup;
  explicitAt: number;
  overriddenAt?: number;
};

@Injectable()
export class OptionStackAssembler {
  private readonly logger = new Logger(OptionStackAssembler.name);

  constructor(
    private readonly stackEntryFactory: OptionInheritanceStackEntryFactory,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
  ) {}

  assemble(contexts: ContextObj[]): {
    stacks: Map<string, OptionInheritanceStackEntryDto[]>;
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >;
  } {
    const allCodes = new Set<string>();
    const groupStatus = new Map<number, GroupStatus>();

    for (let i = 0; i < contexts.length; ++i) {
      const ctx = contexts[i];
      ctx.options.forEach((opt) =>
        allCodes.add(String(opt.code ?? opt.option_code)),
      );
      ctx.optionGroups.forEach((groupObj) => {
        groupObj.options.forEach((opt) =>
          allCodes.add(String(opt.code ?? opt.option_code)),
        );
        if (
          groupObj.options.length > 0 &&
          !groupStatus.has(groupObj.group.id)
        ) {
          groupStatus.set(groupObj.group.id, {
            group: groupObj.group,
            explicitAt: i,
          });
        }
      });
    }

    for (const [groupId, stat] of groupStatus.entries()) {
      for (let j = stat.explicitAt + 1; j < contexts.length; ++j) {
        const nextCtx = contexts[j];
        const existsExplicit =
          nextCtx.optionGroups.find(
            (g) => g.group.id === groupId && g.options.length > 0,
          ) !== undefined;
        if (existsExplicit) {
          stat.overriddenAt = j;
          break;
        }
      }
    }

    for (const [groupId, stat] of groupStatus.entries()) {
      for (let i = stat.explicitAt + 1; i < contexts.length; ++i) {
        const ctx = contexts[i];
        const alreadyExplicit =
          ctx.optionGroups.find(
            (g) => g.group.id === groupId && g.options.length > 0,
          ) !== undefined;
        const alreadyInherited =
          ctx.optionGroups.find(
            (g) => g.group.id === groupId && g.options.length === 0,
          ) !== undefined;
        if (!alreadyExplicit && !alreadyInherited) {
          ctx.optionGroups.push({
            group: stat.group,
            options: [], // inherited
          });
        }
      }
    }

    const allGroups = new Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >();
    for (let i = 0; i < contexts.length; ++i) {
      for (const g of contexts[i].optionGroups) {
        if (!allGroups.has(g.group.id)) {
          allGroups.set(g.group.id, {
            group: g.group,
            ctxIdx: i,
            ctx: contexts[i],
          });
        }
      }
    }

    const stacks = new Map<string, OptionInheritanceStackEntryDto[]>();
    for (const code of allCodes) {
      const stack: OptionInheritanceStackEntryDto[] = [];
      let lastExplicit: OptionInheritanceStackEntryDto | null = null;
      let lastExplicitIdx: number | null = null;
      let lastExplicitGroupId: number | null = null;

      for (let i = 0; i < contexts.length; ++i) {
        const ctx = contexts[i];

        // Einzeloption explizit?
        const foundOpt = ctx.options.find(
          (opt) => String(opt.code ?? opt.option_code) === code,
        );
        if (foundOpt) {
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundOpt,
            true,
            false,
            false,
            null,
            foundOpt.comment ?? null,
            foundOpt.name ?? null,
          );
          stack.push(entry);
          lastExplicit = entry;
          lastExplicitIdx = i;
          lastExplicitGroupId = null;
          continue;
        }

        // Gruppenoption explizit?
        let groupMeta:
          | ReturnType<OptionGroupMetaFactory['fromEntity']>
          | undefined;
        let foundGroupOpt: DhcpOptionRaw | undefined;
        let foundGroup: OptionGroup | undefined;
        for (const groupObj of ctx.optionGroups) {
          const groupOpt = groupObj.options.find(
            (opt) => String(opt.code ?? opt.option_code) === code,
          );
          if (groupOpt) {
            groupMeta = this.optionGroupMetaFactory.fromEntity(
              groupObj.group,
              ctx.level,
              ctx.levelId,
              undefined,
            );
            foundGroupOpt = groupOpt;
            foundGroup = groupObj.group;
            break;
          }
        }
        if (foundGroupOpt && groupMeta && foundGroup) {
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundGroupOpt,
            true,
            false,
            false,
            groupMeta,
            foundGroupOpt.comment ?? null,
            foundGroupOpt.name ?? null,
          );
          stack.push(entry);
          lastExplicit = entry;
          lastExplicitIdx = i;
          lastExplicitGroupId = foundGroup.id;
          continue;
        }

        // inherited
        if (lastExplicit && lastExplicitIdx !== null) {
          let shouldBeInherited = true;
          if (
            lastExplicitGroupId !== null &&
            ctx.optionGroups.some(
              (g) => g.group.id === lastExplicitGroupId && g.options.length > 0,
            )
          ) {
            shouldBeInherited = false;
            lastExplicit = null;
            lastExplicitIdx = null;
            lastExplicitGroupId = null;
          }
          if (shouldBeInherited && lastExplicit) {
            const inherited: OptionInheritanceStackEntryDto = {
              ...lastExplicit,
              level: ctx.level,
              levelId: ctx.levelId,
              isExplicit: false,
              isInherited: true,
              isOverridden: false,
              overriddenBy: undefined,
              value: lastExplicit.value ?? null,
              name: lastExplicit.name ?? null,
            };
            stack.push(inherited);
          }
        }
      }

      // Override-Logik
      for (let i = 0; i < stack.length; ++i) {
        const current = stack[i];
        if (!current.isExplicit) {
          current.isOverridden = false;
          current.overriddenBy = undefined;
          continue;
        }
        let overridden = false;
        let overriddenBy: OptionInheritanceStackEntryDto | undefined =
          undefined;
        for (let j = i + 1; j < stack.length; ++j) {
          const next = stack[j];
          if (next.isExplicit) {
            if (!current.optionGroup && !next.optionGroup) {
              overridden = true;
              overriddenBy = next;
              break;
            }
            if (
              current.optionGroup &&
              next.optionGroup &&
              current.optionGroup.id === next.optionGroup.id &&
              (current.level !== next.level || current.levelId !== next.levelId)
            ) {
              overridden = true;
              overriddenBy = next;
              break;
            }
          }
        }
        current.isOverridden = overridden;
        if (overridden && overriddenBy) {
          let optionGroupMeta:
            | { id: number; name: string; comment?: string | null }
            | undefined;
          if (overriddenBy.optionGroup) {
            optionGroupMeta = {
              id: overriddenBy.optionGroup.id,
              name: overriddenBy.optionGroup.name ?? '',
              comment: overriddenBy.optionGroup.comment ?? null,
            };
          }
          current.overriddenBy = {
            level: overriddenBy.level,
            levelId: overriddenBy.levelId,
            value: overriddenBy.value,
            ...(optionGroupMeta ? { optionGroup: optionGroupMeta } : {}),
          };
        } else {
          current.overriddenBy = undefined;
        }
      }

      stacks.set(code, stack);
    }

    return { stacks, allGroups };
  }

  private getOriginLevel(
    stack: OptionInheritanceStackEntryDto[],
  ): { originLevel: string; originLevelId: number } | undefined {
    let lastOrigin: { originLevel: string; originLevelId: number } | undefined;
    for (let i = 0; i < stack.length; ++i) {
      const entry = stack[i];
      if (entry.isExplicit) {
        lastOrigin = {
          originLevel: entry.level,
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
      fixedAddressesById?: Map<number, { address?: string; name?: string }>;
    },
  ): EffectiveDhcpOptionSlimDto {
    const top = stack[stack.length - 1];
    const isInherited = !!top.isInherited;

    // OriginChain
    const originChain = stack.map((s) => ({
      level: s.level,
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

    // originLevel/Id = letzte explizite Quelle vor der Vererbung!
    let originInfo: Partial<EffectiveDhcpOptionSlimDto['source']> = {};
    if (isInherited && stack.some((s) => s.isExplicit)) {
      const firstExplicit = this.getOriginLevel(stack);
      if (firstExplicit) {
        originInfo = {
          originLevel: firstExplicit.originLevel,
          originLevelId: firstExplicit.originLevelId,
        };
      }
    }

    // ==== OriginLabel generieren! ====
    const originLevelLabel = getOriginLevelLabel(
      originInfo.originLevel as string,
      originInfo.originLevelId as number,
      contextTreeMaps,
    );

    // OptionGroup-Details mit originLevelLabel
    let optionGroupDetails:
      | EffectiveDhcpOptionSlimDto['source']['optionGroup']
      | undefined;
    if (top.optionGroup && contexts) {
      let groupOptions: {
        code: string;
        name?: string;
        value: string | null;
        type: string | null;
        array: boolean | null;
        optionCodeComment: string | null;
        optionCodeSource: string | null;
        optionSpace: any;
      }[] = [];

      for (let k = contexts.length - 1; k >= 0; --k) {
        const ctx = contexts[k];
        const g = ctx.optionGroups.find(
          (g) => g.group.id === top.optionGroup!.id && g.options.length > 0,
        );
        if (g) {
          groupOptions = g.options.map((opt) => ({
            code: String(opt.code ?? opt.option_code),
            name: opt.name ?? undefined,
            value: opt.value ?? opt.option_value ?? null,
            type: opt.type ?? null,
            array: typeof opt.array === 'boolean' ? opt.array : null,
            optionCodeComment: opt.optionCodeComment ?? null,
            optionCodeSource: opt.optionCodeSource ?? null,
            optionSpace: opt.optionSpace ?? null,
          }));
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
            : top.level,
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
            level: candidate.level,
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

    return {
      code: code,
      name: top.name ?? undefined,
      effectiveValue: top.value,
      type: top.type ?? null,
      array: top.array ?? null,
      optionCodeComment: top.optionCodeComment ?? null,
      optionCodeSource: top.optionCodeSource ?? null,
      optionSpace: top.optionSpace
        ? {
            id: top.optionSpace.id,
            name: top.optionSpace.name,
            protocol: top.optionSpace.protocol ?? null,
          }
        : null,
      source: {
        level: top.level,
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
      },
      ...(overridden ? { overridden } : {}),
      comment: top.comment ?? null,
      createdAt: top.createdAt ?? null,
      updatedAt: top.updatedAt ?? null,
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
      fixedAddressesById?: Map<number, { address?: string; name?: string }>;
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
          dto.source.level === lastContext.level.toString() &&
          dto.source.levelId === lastContext.levelId,
      );

      if (!already) {
        const isExplicit = ctxIdx === contexts.length - 1;
        const type: 'GROUP_EXPLICIT' | 'GROUP_INHERITED' = isExplicit
          ? 'GROUP_EXPLICIT'
          : 'GROUP_INHERITED';

        let groupOptions: {
          code: string;
          name?: string;
          value: string | null;
          type: string | null;
          array: boolean | null;
          optionCodeComment: string | null;
          optionCodeSource: string | null;
          optionSpace: any;
        }[] = [];
        for (let i = ctxIdx; i >= 0; --i) {
          const ctx = contexts[i];
          const g = ctx.optionGroups.find(
            (og) => og.group.id === group.id && og.options.length > 0,
          );
          if (g) {
            groupOptions = g.options.map((opt) => ({
              code: String(opt.code ?? opt.option_code),
              name: opt.name ?? undefined,
              value: opt.value ?? opt.option_value ?? null,
              type: opt.type ?? null,
              array: typeof opt.array === 'boolean' ? opt.array : null,
              optionCodeComment: opt.optionCodeComment ?? null,
              optionCodeSource: opt.optionCodeSource ?? null,
              optionSpace: opt.optionSpace ?? null,
            }));
            break;
          }
        }

        // === originLevel/Label für leeres Gruppenpanel bestimmen ===
        const originLevel = !isExplicit
          ? contexts[ctxIdx].level
          : lastContext.level;
        const originLevelId = !isExplicit
          ? contexts[ctxIdx].levelId
          : lastContext.levelId;
        const originLevelLabel = getOriginLevelLabel(
          originLevel as string,
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
            level: lastContext.level,
            levelId: lastContext.levelId,
            type,
            optionGroup: {
              id: group.id,
              name: group.name ?? '',
              comment: group.comment ?? null,
              options: groupOptions,
              groupInheritanceType: type,
              isGroupInherited: !isExplicit,
              groupOriginLevel: originLevel,
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
              level: contexts[ctxIdx].level,
              levelId: contexts[ctxIdx].levelId,
              type,
              optionGroupId: group.id,
              optionGroupName: group.name ?? '',
            },
            {
              level: lastContext.level,
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
