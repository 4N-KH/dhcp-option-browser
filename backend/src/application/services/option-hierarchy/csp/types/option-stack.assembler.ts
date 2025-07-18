import { Injectable, Logger } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '../option-stack-entry.factory';
import { OptionGroupMetaFactory } from '../option-group-meta.factory';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { DhcpOptionRaw } from './dhcp-option-raw.type';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

type ContextObj = {
  level: ObjectType;
  levelId: number;
  options: DhcpOptionRaw[];
  optionGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[];
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
    this.logger.warn(
      '[DEBUG] ContextChain: ' +
        contexts
          .map(
            (c, idx) =>
              `[${idx}] ${c.level} (ID:${c.levelId}) - Optionen: ${c.options.length}, Gruppen: ${c.optionGroups.length}`,
          )
          .join(' -> '),
    );

    // Sammle alle Option-Codes + OptionGroup-Metadaten
    const allCodes = new Set<string>();
    const allGroups = new Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >();
    for (let i = 0; i < contexts.length; ++i) {
      const ctx = contexts[i];
      ctx.options.forEach((opt) =>
        allCodes.add(String(opt.code ?? opt.option_code)),
      );
      ctx.optionGroups.forEach((groupObj) => {
        groupObj.options.forEach((opt) =>
          allCodes.add(String(opt.code ?? opt.option_code)),
        );
        if (!allGroups.has(groupObj.group.id)) {
          allGroups.set(groupObj.group.id, {
            group: groupObj.group,
            ctxIdx: i,
            ctx,
          });
        }
      });
    }

    // Gruppen als inherited für nachfolgende Ebenen sichtbar machen
    for (let i = 0; i < contexts.length; ++i) {
      const ctx = contexts[i];
      const explicitGroupIds = new Set(ctx.optionGroups.map((g) => g.group.id));
      const inheritedGroups: { group: OptionGroup; inheritedFrom: number }[] =
        [];
      for (const [gid, gInfo] of allGroups.entries()) {
        if (gInfo.ctxIdx < i && !explicitGroupIds.has(gid)) {
          inheritedGroups.push({
            group: gInfo.group,
            inheritedFrom: gInfo.ctxIdx,
          });
        }
      }
      for (const inh of inheritedGroups) {
        ctx.optionGroups.push({
          group: inh.group,
          options: [], // inherited Gruppen sind immer leer!
        });
      }
    }

    const stacks = new Map<string, OptionInheritanceStackEntryDto[]>();

    // Für jede Option einen Stack bilden (root→target)
    for (const code of allCodes) {
      const stack: OptionInheritanceStackEntryDto[] = [];
      let lastExplicit: OptionInheritanceStackEntryDto | null = null;

      for (const ctx of contexts) {
        // 1. Explizite Einzeloption
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
            foundOpt.name ?? undefined,
          );
          stack.push(entry);
          lastExplicit = entry;
          continue;
        }

        // 2. Explizite Gruppenoption
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
            foundGroupOpt.name ?? undefined,
          );
          stack.push(entry);
          lastExplicit = entry;
          continue;
        }

        // 3. Inherited: Wenn vorher explizit gesetzt
        if (lastExplicit) {
          const inherited: OptionInheritanceStackEntryDto = {
            ...lastExplicit,
            level: ctx.level,
            levelId: ctx.levelId,
            isExplicit: false,
            isInherited: true,
            isOverridden: false,
            overriddenBy: undefined,
          };
          stack.push(inherited);
        }
      }

      // Override-Logik: Markiere NUR echte Overrides (späteres explizites Setzen auf Kind-Ebene)
      for (let i = 0; i < stack.length; ++i) {
        const current = stack[i];
        let nextExplicitIdx = -1;
        for (let j = i + 1; j < stack.length; ++j) {
          if (stack[j].isExplicit) {
            nextExplicitIdx = j;
            break;
          }
        }
        const next =
          nextExplicitIdx !== -1 ? stack[nextExplicitIdx] : undefined;
        if (
          current.isExplicit &&
          next &&
          (current.level !== next.level || current.levelId !== next.levelId)
        ) {
          current.isOverridden = true;
          let optionGroupMeta:
            | { id: number; name: string; comment?: string | null }
            | undefined;
          if (next.optionGroup) {
            optionGroupMeta = {
              id: next.optionGroup.id,
              name: next.optionGroup.name ?? '',
              comment: next.optionGroup.comment ?? null,
            };
          }
          current.overriddenBy = {
            level: next.level,
            levelId: next.levelId,
            value: next.value,
            ...(optionGroupMeta ? { optionGroup: optionGroupMeta } : {}),
          };
        } else {
          current.isOverridden = false;
          current.overriddenBy = undefined;
        }
      }

      stacks.set(code, stack);
    }

    return { stacks, allGroups };
  }

  buildSlimDtoFromStack(
    code: string,
    stack: OptionInheritanceStackEntryDto[],
    contexts?: ContextObj[],
  ): EffectiveDhcpOptionSlimDto {
    const top = stack[stack.length - 1];
    const isInherited = !!top.isInherited;

    // OriginChain aufbauen
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

    // Gruppen-Details: KEIN inherited/explicit pro Option innerhalb der Gruppe, nur Metadaten!
    let optionGroupDetails:
      | EffectiveDhcpOptionSlimDto['source']['optionGroup']
      | undefined;
    if (top.optionGroup && contexts) {
      const groupContext = contexts
        .find((ctx) => ctx.level === top.level && ctx.levelId === top.levelId)
        ?.optionGroups.find((g) => g.group.id === top.optionGroup!.id);

      const groupOptions =
        groupContext?.options.map((opt) => ({
          code: String(opt.code ?? opt.option_code),
          name: opt.name ?? undefined,
          value: opt.value ?? opt.option_value ?? null,
          type: opt.type ?? null,
          array: typeof opt.array === 'boolean' ? opt.array : null,
          optionCodeComment: opt.optionCodeComment ?? null,
          optionCodeSource: opt.optionCodeSource ?? null,
          optionSpace: opt.optionSpace ?? null,
        })) ?? [];

      optionGroupDetails = {
        id: top.optionGroup.id,
        name: top.optionGroup.name ?? '',
        comment: top.optionGroup.comment ?? null,
        options: groupOptions,
        groupInheritanceType: top.isInherited
          ? 'GROUP_INHERITED'
          : 'GROUP_EXPLICIT',
        isGroupInherited: top.isInherited,
        groupOriginLevel: top.level,
        groupOriginLevelId: top.levelId,
      };
    }

    // Overridden: Nur auf Stack-Ebene relevant
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

    // originLevel: Nur bei inherited!
    let originInfo: Partial<EffectiveDhcpOptionSlimDto['source']> = {};
    if (isInherited && stack.some((s) => s.isExplicit)) {
      const origin = stack.find((s) => s.isExplicit);
      if (origin) {
        originInfo = {
          originLevel: origin.level,
          originLevelId: origin.levelId,
        };
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
  ): EffectiveDhcpOptionSlimDto[] {
    const dtos: EffectiveDhcpOptionSlimDto[] = [];

    // 1. Alle Options-Dtos
    for (const [code, stack] of stacks.entries()) {
      dtos.push(this.buildSlimDtoFromStack(code, stack, contexts));
    }

    const lastContext = contexts[contexts.length - 1];
    for (const { group, ctxIdx } of allGroups.values()) {
      const already = dtos.some(
        (dto) =>
          dto.source.optionGroup &&
          dto.source.optionGroup.id === group.id &&
          dto.source.level === lastContext.level.toString() && // FIX: Enum zu String
          dto.source.levelId === lastContext.levelId,
      );

      if (!already) {
        // Hier explizit als string-Typ setzen, um den Enum-Lint-Fehler zu vermeiden:
        const isExplicit = ctxIdx === contexts.length - 1;
        const type: 'GROUP_EXPLICIT' | 'GROUP_INHERITED' = isExplicit
          ? 'GROUP_EXPLICIT'
          : 'GROUP_INHERITED';

        dtos.push({
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
              options: [],
              groupInheritanceType: type,
              isGroupInherited: !isExplicit,
              groupOriginLevel: contexts[ctxIdx].level,
              groupOriginLevelId: contexts[ctxIdx].levelId,
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
        });
      }
    }
    return dtos;
  }
}
