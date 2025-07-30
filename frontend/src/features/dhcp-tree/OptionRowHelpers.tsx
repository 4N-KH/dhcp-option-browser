import React from "react";
import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";
import { getInheritedLabel } from "./helpers/labels";

// Determine origin label for a single option with fallback logic
function getOriginLevelLabel(option: EffectiveDhcpOptionSlimDto): string | undefined {
  if (option.source.originLevelLabel) return option.source.originLevelLabel;
  if (option.source.optionGroup?.originLevelLabel)
    return option.source.optionGroup.originLevelLabel;
  if (option.source.optionGroup?.groupOriginLevel)
    return option.source.optionGroup.groupOriginLevel;
  return undefined;
}

// Determine origin level ID with fallback
function getOriginLevelId(option: EffectiveDhcpOptionSlimDto): number | undefined {
  if (option.source.originLevelId) return option.source.originLevelId;
  if (option.source.optionGroup?.groupOriginLevelId)
    return option.source.optionGroup.groupOriginLevelId;
  return undefined;
}

// Determine origin level type with fallback
function getOriginLevel(option: EffectiveDhcpOptionSlimDto): string | undefined {
  if (option.source.originLevel) return option.source.originLevel;
  if (option.source.optionGroup?.groupOriginLevel)
    return option.source.optionGroup.groupOriginLevel;
  return undefined;
}

// Badge component indicating status: Explicit, Inherited, or Overridden
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

// Table row for displaying a single DHCP option
export function DhcpOptionRow({
  option,
  rowIndex,
}: {
  option: EffectiveDhcpOptionSlimDto;
  rowIndex: number;
}) {
  const originLevelLabel = getOriginLevelLabel(option); // Human-readable origin label
  const originLevelId = getOriginLevelId(option);
  const originLevel = getOriginLevel(option);

  const isRedundant = option.redundant === true;

  // Apply alternating row background and redundancy highlighting
  const trClass = [
    rowIndex % 2 === 0 ? "bg-blue-950/40" : "",
    "hover:bg-blue-900/40 transition",
    isRedundant ? "bg-red-900/80 text-red-200 font-bold animate-pulse" : "",
  ].join(" ");

  return (
    <tr className={trClass}>
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
          originLevel={originLevel}
          originLevelId={originLevelId}
          originLevelLabel={originLevelLabel}
        />
        {isRedundant && (
          <span className="ml-2 bg-red-800 text-red-100 px-2 py-0.5 rounded text-xs font-semibold">
            Redundant
          </span>
        )}
      </td>
      <td className="px-3 py-1">{option.comment ?? "–"}</td>
    </tr>
  );
}
