import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '@/application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from '@/application/services/option-hierarchy/csp/option-group-meta.factory';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { DhcpOptionRaw } from '../dhcp-option-raw.type';
import type { ContextObj } from './types/context-obj.type'; // **Robust typisiert!**
import { GroupStatus } from './helpers/group-status.helper';

@Injectable()
export class StackBuilderService {
  constructor(
    private readonly stackEntryFactory: OptionInheritanceStackEntryFactory,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
  ) {}

  build(contexts: ContextObj[]): {
    stacks: Map<string, OptionInheritanceStackEntryDto[]>;
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >;
  } {
    const allCodes = new Set<string>();
    const groupStatus = new Map<number, GroupStatus>();

    // Codes und Gruppenstatus initial sammeln
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

    // Gruppen, die später überschrieben werden, tracken
    for (const [groupId, stat] of groupStatus.entries()) {
      for (let j = stat.explicitAt + 1; j < contexts.length; ++j) {
        const nextCtx = contexts[j];
        const existsExplicit = nextCtx.optionGroups.some(
          (g) => g.group.id === groupId && g.options.length > 0,
        );
        if (existsExplicit) {
          stat.overriddenAt = j;
          break;
        }
      }
    }

    // Gruppen in nachfolgenden Kontexten als inherited sichtbar machen
    for (const [groupId, stat] of groupStatus.entries()) {
      for (let i = stat.explicitAt + 1; i < contexts.length; ++i) {
        const ctx = contexts[i];
        const alreadyExplicit = ctx.optionGroups.some(
          (g) => g.group.id === groupId && g.options.length > 0,
        );
        const alreadyInherited = ctx.optionGroups.some(
          (g) => g.group.id === groupId && g.options.length === 0,
        );
        if (!alreadyExplicit && !alreadyInherited) {
          ctx.optionGroups.push({ group: stat.group, options: [] });
        }
      }
    }

    // Alle Gruppen zusammenstellen
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

    // Für jeden Option-Code den Stack bauen
    const stacks = new Map<string, OptionInheritanceStackEntryDto[]>();
    for (const code of allCodes) {
      const stack: OptionInheritanceStackEntryDto[] = [];
      let lastExplicit: OptionInheritanceStackEntryDto | null = null;
      let lastExplicitIdx: number | null = null;
      let lastExplicitGroupId: number | null = null;

      for (let i = 0; i < contexts.length; ++i) {
        const ctx = contexts[i];
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
        if (lastExplicit && lastExplicitIdx !== null) {
          let shouldBeInherited = true;
          if (
            lastExplicitGroupId !== null &&
            ctx.optionGroups.some(
              (g) =>
                g.group.id === lastExplicitGroupId &&
                g.options.some(
                  (o) =>
                    String(o.code ?? o.option_code) === code &&
                    o.value !== lastExplicit!.value,
                ),
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

      // Overridden-Status berechnen
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
}
