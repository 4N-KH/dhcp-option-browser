import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import type { GroupOptionDto } from '@/application/services/option-hierarchy/csp/types/option-stack-assembler/types/group-option-dto.type';

/**
 * Panel-strikte Redundanz (über Gruppen hinweg!): Markiert alle Optionen im Panel (egal in welcher Gruppe),
 * die exakt gleichen Key haben (code + value). Einzeloptionen UND alle Gruppenoptionen werden gemeinsam geprüft.
 */
export function markRedundancyPerPanelStrict(
  options: EffectiveDhcpOptionSlimDto[],
): void {
  // Alle Optionen im Panel – sowohl flache als auch aus Gruppen – einsammeln!
  type Ref = { opt?: EffectiveDhcpOptionSlimDto; groupOpt?: GroupOptionDto };
  const allKeys = new Map<string, Ref[]>();

  // Einzeloptionen
  options.forEach((opt) => {
    if (
      opt.code &&
      (!opt.source?.optionGroup ||
        !Array.isArray(opt.source?.optionGroup?.options))
    ) {
      const key = `${String(opt.code)}§${String(opt.effectiveValue ?? '')}`;
      if (!allKeys.has(key)) allKeys.set(key, []);
      allKeys.get(key)!.push({ opt });
    }
    // Gruppenoptionen (verschachtelt, alle flatten!)
    if (
      opt.source?.optionGroup &&
      Array.isArray(opt.source.optionGroup.options)
    ) {
      opt.source.optionGroup.options.forEach((groupOptRaw) => {
        const groupOpt = groupOptRaw as GroupOptionDto;
        const key = `${String(groupOpt.code)}§${String(groupOpt.value ?? '')}`;
        if (!allKeys.has(key)) allKeys.set(key, []);
        allKeys.get(key)!.push({ groupOpt });
      });
    }
  });

  // Jetzt Markierung setzen (redundant nur, wenn der gleiche Key mehr als einmal im Panel vorkommt)
  for (const occurrences of allKeys.values()) {
    if (occurrences.length > 1) {
      occurrences.forEach((entry) => {
        if (entry.opt) entry.opt.redundant = true;
        if (entry.groupOpt) entry.groupOpt.redundant = true;
      });
    } else {
      occurrences.forEach((entry) => {
        if (entry.opt) delete entry.opt.redundant;
        if (entry.groupOpt) delete entry.groupOpt.redundant;
      });
    }
  }
}
