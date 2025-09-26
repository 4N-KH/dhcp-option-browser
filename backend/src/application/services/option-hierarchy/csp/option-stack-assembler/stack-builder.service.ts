import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '@/application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from '@/application/services/option-hierarchy/csp/option-group-meta.factory';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { DhcpOptionRaw } from '@/application/services/option-hierarchy/csp/types/dhcp-option-raw.type';
import type { ContextObj } from '../types/context-obj.type';
import { GroupStatus } from './helpers/group-status.helper';

/** ---------------------- Safe access helpers (no any-indexing) ---------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function getStrField(
  obj: unknown,
  primary: string,
  fallback?: string,
  defaultValue = '',
): string {
  if (!isRecord(obj)) return defaultValue;
  if (primary in obj && typeof obj[primary] === 'string') return obj[primary];
  if (fallback && fallback in obj && typeof obj[fallback] === 'string')
    return obj[fallback];
  return defaultValue;
}
function getNullableStrField(
  obj: unknown,
  primary: string,
  fallback?: string,
): string | null {
  if (!isRecord(obj)) return null;
  if (primary in obj) {
    const v = obj[primary];
    if (typeof v === 'string') return v;
    if (v === null) return null;
  }
  if (fallback && fallback in obj) {
    const v = obj[fallback];
    if (typeof v === 'string') return v;
    if (v === null) return null;
  }
  return null;
}
const codeOf = (o: unknown) => getStrField(o, 'code', 'option_code', '');
const valueOf = (o: unknown) => getNullableStrField(o, 'value', 'option_value');
const typeOf = (o: unknown) => getStrField(o, 'type', undefined, '');

/** Stable deduplication by Code|Value|Type combination */
function dedupeOptionList(list: DhcpOptionRaw[]): DhcpOptionRaw[] {
  const seen = new Set<string>();
  const out: DhcpOptionRaw[] = [];
  for (const o of list ?? []) {
    const key = [codeOf(o), valueOf(o) ?? '', typeOf(o)].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/** ---------------------------------------------------------------------------------------- */

@Injectable()
export class StackBuilderService {
  constructor(
    private readonly stackEntryFactory: OptionInheritanceStackEntryFactory,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
  ) {}

  /**
   * Builds for all occurring option codes the inheritance stack across all contexts.
   * Returns Map<code, stack> and all discovered groups.
   */
  build(contexts: ContextObj[]): {
    stacks: Map<string, OptionInheritanceStackEntryDto[]>;
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >;
  } {
    const allCodes = new Set<string>();
    const groupStatus = new Map<number, GroupStatus>();

    /** 1) Clean contexts (dedupe) and collect codes/group status */
    const contextsClean: ContextObj[] = contexts.map((ctx) => {
      const cleanGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[] =
        [];
      const seenGroupIds = new Set<number>();

      for (const g of ctx.optionGroups) {
        if (!g?.group?.id) continue;
        if (seenGroupIds.has(g.group.id)) continue;
        seenGroupIds.add(g.group.id);
        const options = dedupeOptionList(g.options ?? []);
        cleanGroups.push({ group: g.group, options });
      }

      const options = dedupeOptionList(ctx.options ?? []);

      // Collect codes
      options.forEach((opt) => allCodes.add(codeOf(opt)));
      cleanGroups.forEach((g) =>
        g.options.forEach((opt) => allCodes.add(codeOf(opt))),
      );

      // Initialize group status (explicitAt = first occurrence with options)
      cleanGroups.forEach((g) => {
        if (g.options.length > 0 && !groupStatus.has(g.group.id)) {
          groupStatus.set(g.group.id, {
            group: g.group,
            explicitAt: -1, // initial placeholder
          });
        }
      });

      return { ...ctx, options, optionGroups: cleanGroups };
    });

    /** 2) Set explicitAt per group */
    for (let i = 0; i < contextsClean.length; ++i) {
      for (const groupObj of contextsClean[i].optionGroups) {
        const status = groupStatus.get(groupObj.group.id);
        if (!status) continue;
        if (groupObj.options.length > 0 && status.explicitAt === -1) {
          status.explicitAt = i;
        }
      }
    }

    /** 3) Mark groups that are overridden later (info only) */
    for (const [groupId, stat] of groupStatus.entries()) {
      if (stat.explicitAt < 0) continue;
      for (let j = stat.explicitAt + 1; j < contextsClean.length; ++j) {
        const nextCtx = contextsClean[j];
        const existsExplicit = nextCtx.optionGroups.some(
          (g) => g.group.id === groupId && g.options.length > 0,
        );
        if (existsExplicit) {
          stat.overriddenAt = j;
          break;
        }
      }
    }

    /** 4) Add inherited group placeholders further down */
    for (const [, stat] of groupStatus.entries()) {
      if (stat.explicitAt < 0) continue;
      for (let i = stat.explicitAt + 1; i < contextsClean.length; ++i) {
        const ctx = contextsClean[i];
        const alreadyExplicit = ctx.optionGroups.some(
          (g) => g.group.id === stat.group.id && g.options.length > 0,
        );
        const alreadyInherited = ctx.optionGroups.some(
          (g) => g.group.id === stat.group.id && g.options.length === 0,
        );
        if (!alreadyExplicit && !alreadyInherited) {
          ctx.optionGroups.push({ group: stat.group, options: [] }); // placeholder → GROUP_INHERITED
        }
      }
    }

    /** 5) Collect all groups into a map (for panels) */
    const allGroups = new Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >();
    for (let i = 0; i < contextsClean.length; ++i) {
      for (const g of contextsClean[i].optionGroups) {
        if (!allGroups.has(g.group.id)) {
          allGroups.set(g.group.id, {
            group: g.group,
            ctxIdx: i,
            ctx: contextsClean[i],
          });
        }
      }
    }

    /** 6) Build inheritance stack for each code */
    const stacks = new Map<string, OptionInheritanceStackEntryDto[]>();

    for (const code of allCodes) {
      const stack: OptionInheritanceStackEntryDto[] = [];
      let lastExplicit: OptionInheritanceStackEntryDto | null = null;
      let lastExplicitIdx: number | null = null;
      let lastExplicitGroupId: number | null = null;

      for (let i = 0; i < contextsClean.length; ++i) {
        const ctx = contextsClean[i];

        /** 6a) Single option directly on this context */
        const foundOpt = ctx.options.find((opt) => codeOf(opt) === code);
        if (foundOpt) {
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundOpt,
            true, // isExplicit
            false, // isInherited
            false, // isOverridden (calculated later)
            null, // no group
            (foundOpt as { comment?: string | null }).comment ?? null,
            (foundOpt as { name?: string | null }).name ?? null,
          );
          stack.push(entry);
          lastExplicit = entry;
          lastExplicitIdx = i;
          lastExplicitGroupId = null;
          continue;
        }

        /** 6b) Option via OptionGroup in this context */
        let groupMeta:
          | ReturnType<OptionGroupMetaFactory['fromEntity']>
          | undefined;
        let foundGroupOpt: DhcpOptionRaw | undefined;
        let foundGroup: OptionGroup | undefined;

        for (const groupObj of ctx.optionGroups) {
          const groupOpt = groupObj.options.find((opt) => codeOf(opt) === code);
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
          /** Priority: single option wins over group
           * If the last explicit source was a single option (no group),
           * a later group option with the same code must not override it.
           * → Instead inherit the single option into this context.
           */
          if (
            lastExplicit &&
            lastExplicitIdx !== null &&
            lastExplicitGroupId === null
          ) {
            const inheritedFromSingle: OptionInheritanceStackEntryDto = {
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
            stack.push(inheritedFromSingle);
            continue;
          }

          // Default: group explicit in this context
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundGroupOpt,
            true, // isExplicit
            false, // isInherited
            false, // isOverridden (calculated later)
            groupMeta,
            (foundGroupOpt as { comment?: string | null }).comment ?? null,
            (foundGroupOpt as { name?: string | null }).name ?? null,
          );
          stack.push(entry);
          lastExplicit = entry;
          lastExplicitIdx = i;
          lastExplicitGroupId = foundGroup.id;
          continue;
        }

        /** 6c) Continue inheritance of the last explicit source if valid */
        if (lastExplicit && lastExplicitIdx !== null) {
          let shouldInherit = true;

          // If last explicit came from the same group and this group sets a different value
          // for the same code here → stop inheritance.
          if (
            lastExplicitGroupId !== null &&
            ctx.optionGroups.some(
              (g) =>
                g.group.id === lastExplicitGroupId &&
                g.options.some(
                  (o) =>
                    codeOf(o) === code && valueOf(o) !== lastExplicit!.value,
                ),
            )
          ) {
            shouldInherit = false;
            lastExplicit = null;
            lastExplicitIdx = null;
            lastExplicitGroupId = null;
          }

          if (shouldInherit && lastExplicit) {
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

      /** 7) Calculate overridden status per stack entry */
      for (let i = 0; i < stack.length; ++i) {
        const current = stack[i];
        if (!current.isExplicit) {
          current.isOverridden = false;
          current.overriddenBy = undefined;
          continue;
        }

        let overridden = false;
        let overriddenBy: OptionInheritanceStackEntryDto | undefined;

        for (let j = i + 1; j < stack.length; ++j) {
          const next = stack[j];
          if (!next.isExplicit) continue;

          // single vs. single → later explicit overrides
          if (!current.optionGroup && !next.optionGroup) {
            overridden = true;
            overriddenBy = next;
            break;
          }

          // same group, later explicit at different level → overrides
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

        current.isOverridden = overridden;
        if (overridden && overriddenBy) {
          current.overriddenBy = {
            level: overriddenBy.level,
            levelId: overriddenBy.levelId,
            value: overriddenBy.value,
            ...(overriddenBy.optionGroup
              ? {
                  optionGroup: {
                    id: overriddenBy.optionGroup.id,
                    name: overriddenBy.optionGroup.name ?? '',
                    comment: overriddenBy.optionGroup.comment ?? null,
                  },
                }
              : {}),
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
