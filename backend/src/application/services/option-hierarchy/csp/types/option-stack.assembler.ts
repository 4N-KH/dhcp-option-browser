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
    // 1. Codes und Gruppen sammeln
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

    // 2. Overridden suchen
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

    // 3. Explizite Gruppen als inherited sichtbar machen
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

    // 4. Map für alle Groups am Target für buildSlimDtoForAll
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

    // 5. Stack für jede Option (HIER ist die robuste Logik)
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

        // inherited – aber: WENN eine Option auf Child überschrieben wurde, ist diese jetzt die neue Quelle!
        if (lastExplicit && lastExplicitIdx !== null) {
          let shouldBeInherited = true;
          if (
            lastExplicitGroupId !== null &&
            ctx.optionGroups.some(
              (g) => g.group.id === lastExplicitGroupId && g.options.length > 0,
            )
          ) {
            // Hier wird OptionGroup überschrieben, also keine weitere Vererbung ab hier
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
            // Einzeloption
            if (!current.optionGroup && !next.optionGroup) {
              overridden = true;
              overriddenBy = next;
              break;
            }
            // Gruppenoption – gleiche Gruppe und Code
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

  // Hilfsmethode: Erste explizite Ebene im Stack finden (für originLevel)
  private getOriginLevel(
    stack: OptionInheritanceStackEntryDto[],
  ): { originLevel: string; originLevelId: number } | undefined {
    // Suche vom Ende nach der letzten expliziten Option, die vor einer Vererbung stand
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

    // OptionGroup-Details
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
        groupOriginLevel:
          isInherited && stack.some((s) => s.isExplicit)
            ? (originInfo.originLevel as string)
            : top.level,
        groupOriginLevelId:
          isInherited && stack.some((s) => s.isExplicit)
            ? (originInfo.originLevelId as number)
            : top.levelId,
      };
    }

    // Overridden wie gehabt
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
  ): EffectiveDhcpOptionSlimDto[] {
    const dtos: EffectiveDhcpOptionSlimDto[] = [];

    // Alle Options-Dtos (direct + group)
    for (const [code, stack] of stacks.entries()) {
      dtos.push(this.buildSlimDtoFromStack(code, stack, contexts));
    }

    // Ergänze leere Gruppenpanels am Target (UI)
    const lastContext = contexts[contexts.length - 1];
    for (const { group, ctxIdx } of allGroups.values()) {
      const already = dtos.some(
        (dto) =>
          dto.source.optionGroup &&
          dto.source.optionGroup.id === group.id &&
          dto.source.level === lastContext.level.toString() &&
          dto.source.levelId === lastContext.levelId,
      );

      if (!already) {
        // explizit/inherited korrekt markieren:
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
              groupOriginLevel: !isExplicit
                ? contexts[ctxIdx].level
                : lastContext.level,
              groupOriginLevelId: !isExplicit
                ? contexts[ctxIdx].levelId
                : lastContext.levelId,
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
