import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import type { GroupOptionDto } from '@/application/services/option-hierarchy/csp/types/option-stack-assembler/types/group-option-dto.type';

/**
 * Panel-strikte Redundanz (über Gruppen hinweg!):
 * Markiert alle Optionen im aktuellen Panel als redundant, wenn
 * derselbe **Optionscode** (unabhängig vom Wert) mindestens zweimal vorkommt.
 *
 * Einzeloptionen UND alle Gruppenoptionen werden gemeinsam geprüft.
 */
export function markRedundancyPerPanelStrict(
  options: EffectiveDhcpOptionSlimDto[],
): void {
  type Ref = { opt?: EffectiveDhcpOptionSlimDto; groupOpt?: GroupOptionDto };
  const byCode = new Map<string, Ref[]>();

  for (const opt of options) {
    const isGroupContainer =
      !!opt.source?.optionGroup &&
      Array.isArray(opt.source.optionGroup.options);

    if (opt.code && !isGroupContainer) {
      const key = String(opt.code);
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key)!.push({ opt });
    }

    if (isGroupContainer) {
      for (const groupOptRaw of opt.source.optionGroup!.options) {
        const groupOpt = groupOptRaw as GroupOptionDto;
        const key = String(groupOpt.code);
        if (!byCode.has(key)) byCode.set(key, []);
        byCode.get(key)!.push({ groupOpt });
      }
    }
  }
  for (const occurrences of byCode.values()) {
    const redundant = occurrences.length > 1;
    for (const entry of occurrences) {
      if (entry.opt) {
        if (redundant) entry.opt.redundant = true;
        else delete entry.opt.redundant;
      }
      if (entry.groupOpt) {
        if (redundant) entry.groupOpt.redundant = true;
        else delete entry.groupOpt.redundant;
      }
    }
  }
}
