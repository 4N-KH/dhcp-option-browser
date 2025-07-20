import React from "react";
import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";
import { getInheritedLabel } from "./helpers/labels";

// Status-Badge für Einzeloptionen und Gruppenpanel
export function StatusBadge({
  status,
  overridden,
  originLevel,
  originLevelId,
  originLevelLabel,
}: {
  status: EffectiveDhcpOptionSlimDto["source"]["type"];
  overridden?: EffectiveDhcpOptionSlimDto["overridden"];
  originLevel?: string;
  originLevelId?: number;
  originLevelLabel?: string;
}) {
  if (overridden)
    return (
      <span className="bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded text-xs font-semibold">
        Overridden
      </span>
    );
  if (status === "INHERITED" || status === "GROUP_INHERITED")
    return (
      <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
        {originLevelLabel
          ? <>Inherited from <b>{originLevelLabel}</b></>
          : getInheritedLabel(originLevel, undefined, originLevelId)}
      </span>
    );
  return (
    <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-semibold">
      Explicit
    </span>
  );
}

// Einzelne Optionszeile für Direct-Options
export function DhcpOptionRow({
  option,
}: {
  option: EffectiveDhcpOptionSlimDto;
}) {
  // 1. Versuche originLevelLabel direkt vom Option-Objekt (neues Backend!).
  // 2. Sonst fallback: originLevelLabel aus OptionGroup.
  // 3. Sonst: Helper generiert Default.
  const originLevelLabel =
    option.source.originLevelLabel ||
    option.source.optionGroup?.originLevelLabel ||
    undefined;

  return (
    <tr>
      <td className="font-mono">{option.code}</td>
      <td>{option.name ?? "–"}</td>
      <td>{option.effectiveValue ?? "–"}</td>
      <td>
        {option.optionSpace
          ? `${option.optionSpace.name}${option.optionSpace.protocol ? " (" + option.optionSpace.protocol + ")" : ""}`
          : "–"}
      </td>
      <td>{option.type ?? "–"}</td>
      <td>
        <StatusBadge
          status={option.source.type}
          overridden={option.overridden}
          originLevel={option.source.originLevel}
          originLevelId={option.source.originLevelId}
          originLevelLabel={originLevelLabel}
        />
      </td>
      <td>{option.comment ?? "–"}</td>
    </tr>
  );
}
