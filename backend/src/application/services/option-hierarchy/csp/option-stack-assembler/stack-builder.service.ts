import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '@/application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from '@/application/services/option-hierarchy/csp/option-group-meta.factory';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { DhcpOptionRaw } from '@/application/services/option-hierarchy/csp/types/dhcp-option-raw.type';
import type { ContextObj } from '../types/context-obj.type';
import { GroupStatus } from './helpers/group-status.helper';

/** --- Safe access helpers (no `any`, no unsafe member access) --- */
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

  if (primary in obj) {
    const v: unknown = obj[primary];
    if (typeof v === 'string') return v;
  }
  if (fallback && fallback in obj) {
    const v: unknown = obj[fallback];
    if (typeof v === 'string') return v;
  }
  return defaultValue;
}

function getNullableStrField(
  obj: unknown,
  primary: string,
  fallback?: string,
): string | null {
  if (!isRecord(obj)) return null;

  if (primary in obj) {
    const v: unknown = obj[primary];
    if (typeof v === 'string') return v;
    if (v === null) return null;
  }
  if (fallback && fallback in obj) {
    const v: unknown = obj[fallback];
    if (typeof v === 'string') return v;
    if (v === null) return null;
  }
  return null;
}

function codeOf(o: unknown): string {
  return getStrField(o, 'code', 'option_code', '');
}
function valueOf(o: unknown): string | null {
  return getNullableStrField(o, 'value', 'option_value');
}
function typeOf(o: unknown): string {
  return getStrField(o, 'type', undefined, '');
}

function dedupeOptionList(list: DhcpOptionRaw[]): DhcpOptionRaw[] {
  const seen = new Set<string>();
  const out: DhcpOptionRaw[] = [];
  for (const o of list ?? []) {
    const key = [codeOf(o), String(valueOf(o) ?? ''), typeOf(o)].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

@Injectable()
export class StackBuilderService {
  constructor(
    private readonly stackEntryFactory: OptionInheritanceStackEntryFactory,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
  ) {}

  /**
   * Builds inheritance stacks for all option codes across the provided contexts.
   * Returns a map of option code → stack entries and a map of all option groups.
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

    // 1) Clean contexts and collect codes and group status
    const contextsClean: ContextObj[] = contexts.map((ctx) => {
      const cleanGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[] =
        [];
      const seenGroupIds = new Set<number>();
      for (const g of ctx.optionGroups) {
        if (!g?.group?.id) continue;
        if (seenGroupIds.has(g.group.id)) continue;
        seenGroupIds.add(g.group.id);
        cleanGroups.push({
          group: g.group,
          options: dedupeOptionList(g.options ?? []),
        });
      }
      const options = dedupeOptionList(ctx.options ?? []);
      // collect option codes
      options.forEach((opt) => allCodes.add(codeOf(opt)));
      cleanGroups.forEach((groupObj) => {
        groupObj.options.forEach((opt) => allCodes.add(codeOf(opt)));
        if (
          groupObj.options.length > 0 &&
          !groupStatus.has(groupObj.group.id)
        ) {
          groupStatus.set(groupObj.group.id, {
            group: groupObj.group,
            explicitAt: 0, // placeholder, set below
          });
        }
      });
      return { ...ctx, options, optionGroups: cleanGroups };
    });

    // set explicitAt for each group
    for (let i = 0; i < contextsClean.length; ++i) {
      for (const groupObj of contextsClean[i].optionGroups) {
        if (
          groupObj.options.length > 0 &&
          groupObj.group?.id !== undefined &&
          groupStatus.has(groupObj.group.id)
        ) {
          const s = groupStatus.get(groupObj.group.id)!;
          if (s.explicitAt === 0) s.explicitAt = i;
        }
      }
    }

    // 2) Track groups that are overridden later
    for (const [groupId, stat] of groupStatus.entries()) {
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

    // 3) Add inherited group placeholders to later contexts
    for (const [, stat] of groupStatus.entries()) {
      for (let i = stat.explicitAt + 1; i < contextsClean.length; ++i) {
        const ctx = contextsClean[i];
        const alreadyExplicit = ctx.optionGroups.some(
          (g) => g.group.id === stat.group.id && g.options.length > 0,
        );
        const alreadyInherited = ctx.optionGroups.some(
          (g) => g.group.id === stat.group.id && g.options.length === 0,
        );
        if (!alreadyExplicit && !alreadyInherited) {
          ctx.optionGroups.push({ group: stat.group, options: [] });
        }
      }
    }

    // 4) Collect all groups across contexts
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

    // 5) Build option stacks for each option code
    const stacks = new Map<string, OptionInheritanceStackEntryDto[]>();

    for (const code of allCodes) {
      const stack: OptionInheritanceStackEntryDto[] = [];
      let lastExplicit: OptionInheritanceStackEntryDto | null = null;
      let lastExplicitIdx: number | null = null;
      let lastExplicitGroupId: number | null = null;

      for (let i = 0; i < contextsClean.length; ++i) {
        const ctx = contextsClean[i];

        // 5a) direct option on this context
        const foundOpt = ctx.options.find((opt) => codeOf(opt) === code);
        if (foundOpt) {
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundOpt,
            true,
            false,
            false,
            null,
            (foundOpt as { comment?: string | null }).comment ?? null,
            (foundOpt as { name?: string | null }).name ?? null,
          );
          stack.push(entry);
          lastExplicit = entry;
          lastExplicitIdx = i;
          lastExplicitGroupId = null;
          continue;
        }

        // 5b) option via option group
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
          const entry = this.stackEntryFactory.toStackEntry(
            ctx.level,
            ctx.levelId,
            foundGroupOpt,
            true,
            false,
            false,
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

        // 5c) inherit last explicit value if still valid
        if (lastExplicit && lastExplicitIdx !== null) {
          let shouldBeInherited = true;

          // if last explicit came from a group and the same group
          // sets a different value here, stop inheritance
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

      // 6) calculate overridden status
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
