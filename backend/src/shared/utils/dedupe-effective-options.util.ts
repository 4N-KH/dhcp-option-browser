import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import type { GroupOptionDto } from '@/application/services/option-hierarchy/csp/types/option-stack-assembler/types/group-option-dto.type';

/**
 * Entfernt 100% identische Einzeloptionen (Key) und Duplikate von Gruppen-Panels (selbe ID/Namen).
 * Nur der erste Panel-Eintrag einer Gruppe bleibt, alle weiteren werden entfernt.
 */
export function dedupeEffectiveDhcpOptionSlimDtoArray(
  options: EffectiveDhcpOptionSlimDto[],
): EffectiveDhcpOptionSlimDto[] {
  // Einzeloptionen: dedupe nach allen Keys (wie gehabt)
  const singleOptKeys = new Set<string>();
  const seenGroupIds = new Set<number>(); // Nur EIN Panel pro Gruppe
  const result: EffectiveDhcpOptionSlimDto[] = [];

  function getOptionSpaceId(opt: {
    optionSpace?: { id?: number | null } | null;
  }): string {
    const id =
      opt && opt.optionSpace && typeof opt.optionSpace.id === 'number'
        ? opt.optionSpace.id
        : undefined;
    return id !== undefined ? String(id) : '';
  }

  for (const opt of options) {
    // Einzeloption (keine Gruppe)
    if (
      opt.code &&
      (!opt.source?.optionGroup ||
        !Array.isArray(opt.source?.optionGroup?.options))
    ) {
      const key = [
        opt.code,
        opt.effectiveValue ?? '',
        opt.type ?? '',
        getOptionSpaceId(opt),
        opt.source?.level ?? '',
        opt.source?.levelId ?? '',
      ].join('|');
      if (singleOptKeys.has(key)) continue;
      singleOptKeys.add(key);
      result.push(opt);
      continue;
    }

    // Gruppen-Panels: nur einen Eintrag pro Group-ID behalten!
    if (
      opt.source?.optionGroup &&
      typeof opt.source.optionGroup.id === 'number'
    ) {
      const groupId = opt.source.optionGroup.id;
      if (seenGroupIds.has(groupId)) continue;
      seenGroupIds.add(groupId);

      // Dedupe innerhalb der Gruppe wie gehabt
      const dedupedGroupOptions: GroupOptionDto[] = [];
      const seenGroupKeys = new Set<string>();
      for (const groupOptRaw of opt.source.optionGroup.options) {
        const groupOpt = groupOptRaw as GroupOptionDto;
        const groupKey = [
          groupId,
          groupOpt.code,
          groupOpt.value ?? '',
          groupOpt.type ?? '',
          getOptionSpaceId(groupOpt),
          groupOpt.level ?? '',
          groupOpt.levelId ?? '',
        ].join('|');
        if (seenGroupKeys.has(groupKey)) continue;
        seenGroupKeys.add(groupKey);
        dedupedGroupOptions.push(groupOpt);
      }
      if (dedupedGroupOptions.length > 0) {
        result.push({
          ...opt,
          source: {
            ...opt.source,
            optionGroup: {
              ...opt.source.optionGroup,
              options: dedupedGroupOptions,
            },
          },
        });
      }
    }
  }

  return result;
}
