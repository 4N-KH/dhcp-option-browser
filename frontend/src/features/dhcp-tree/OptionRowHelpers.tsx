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
      <span className="bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10">
        Overridden
      </span>
    );
  if (status === "INHERITED" || status === "GROUP_INHERITED")
    return (
      <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10">
        {originLevelLabel
          ? <>Inherited from <b>{originLevelLabel}</b></>
          : getInheritedLabel(originLevel, undefined, originLevelId)}
      </span>
    );
  return (
    <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10">
      Explicit
    </span>
  );
}

// Einzelne Optionszeile für Options-Tabelle
export function DhcpOptionRow({
  option,
  rowIndex,
}: {
  option: EffectiveDhcpOptionSlimDto;
  rowIndex: number;
}) {
  const originLevelLabel =
    option.source.originLevelLabel ||
    option.source.optionGroup?.originLevelLabel ||
    undefined;

  return (
    <tr
      className={`${
        rowIndex % 2 === 0 ? "bg-blue-950/40" : ""
      } hover:bg-blue-900/40 transition`}
    >
      <td className="font-mono px-3 py-1">{option.code}</td>
      <td className="px-3 py-1">{option.name ?? "–"}</td>
      <td className="font-mono px-3 py-1">{option.effectiveValue ?? "–"}</td>
      <td className="px-3 py-1">
        {option.optionSpace
          ? `${option.optionSpace.name}${option.optionSpace.protocol ? " (" + option.optionSpace.protocol + ")" : ""}`
          : "–"}
      </td>
      <td className="px-3 py-1">{option.type ?? "–"}</td>
      <td className="px-3 py-1">
        <StatusBadge
          status={option.source.type}
          overridden={option.overridden}
          originLevel={option.source.originLevel}
          originLevelId={option.source.originLevelId}
          originLevelLabel={originLevelLabel}
        />
      </td>
      <td className="px-3 py-1">{option.comment ?? "–"}</td>
    </tr>
  );
}
