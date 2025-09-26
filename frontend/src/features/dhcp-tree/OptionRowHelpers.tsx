import React from "react";
import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";
import { getInheritedLabel } from "./helpers/labels";

/** Solid, high-contrast color palette (only for redundant rows) */
type Tone = { bg: string; text: string };
const TONES: Tone[] = [
  { bg: "bg-red-600", text: "text-white" },
  { bg: "bg-green-600", text: "text-white" },
  { bg: "bg-yellow-400", text: "text-black" },
  { bg: "bg-orange-500", text: "text-black" },
  { bg: "bg-blue-600", text: "text-white" },
  { bg: "bg-purple-600", text: "text-white" },
  { bg: "bg-teal-600", text: "text-white" },
  { bg: "bg-pink-600", text: "text-white" },
];

/** Deterministically derive a tone based on the option code */
export function getSolidByCode(code: string | number): Tone {
  const s = String(code);
  const n = /^\d+$/.test(s)
    ? parseInt(s, 10)
    : Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);
  return TONES[Math.abs(n) % TONES.length];
}

/** Build a stable key for "redundantWith" pairs */
export function getOptionKey(
  code: string,
  value: string | null,
  level: string,
  levelId: number,
  groupId?: number,
) {
  return [code, value ?? "", level, String(levelId), String(groupId ?? "")]
    .map((s) => encodeURIComponent(s))
    .join("|");
}

/** Helpers to extract origin level metadata from single or group source */
function getOriginLevelLabel(o: EffectiveDhcpOptionSlimDto): string | undefined {
  return (
    o.source.originLevelLabel ??
    o.source.optionGroup?.originLevelLabel ??
    o.source.optionGroup?.groupOriginLevel
  );
}
function getOriginLevelId(o: EffectiveDhcpOptionSlimDto): number | undefined {
  return o.source.originLevelId ?? o.source.optionGroup?.groupOriginLevelId;
}
function getOriginLevel(o: EffectiveDhcpOptionSlimDto): string | undefined {
  return o.source.originLevel ?? o.source.optionGroup?.groupOriginLevel;
}

/** Status badge: explicit / inherited / overridden */
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
  if (overridden) {
    return (
      <span className="bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded text-xs font-semibold ring-1 ring-white/10">
        Overridden
      </span>
    );
  }
  if (status === "INHERITED" || status === "GROUP_INHERITED") {
    return (
      <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold ring-1 ring-white/10">
        {originLevelLabel ? (
          <>
            Inherited from <b>{originLevelLabel}</b>
          </>
        ) : (
          getInheritedLabel(originLevel, undefined, originLevelId)
        )}
      </span>
    );
  }
  return (
    <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-semibold ring-1 ring-white/10">
      Explicit
    </span>
  );
}

/** Table row for a single effective DHCP option */
export function DhcpOptionRow({
  option,
  rowIndex,
}: {
  option: EffectiveDhcpOptionSlimDto;
  rowIndex: number;
}) {
  const originLevelLabel = getOriginLevelLabel(option);
  const originLevelId = getOriginLevelId(option);
  const originLevel = getOriginLevel(option);
  const isRedundant = option.redundant === true;

  const tone = isRedundant ? getSolidByCode(option.code) : null;
  const trClass = isRedundant
    ? `${tone!.bg} ${tone!.text} font-semibold`
    : rowIndex % 2
      ? "hover:bg-white/5"
      : "hover:bg-white/5";

  // Nur effectiveValue verwenden (Single-Optionen). Falls ein Backend ausnahmsweise ein "value" mitsendet,
  // kann dieser Fallback den Wert lesen, ohne die TS-Typen aufzubrechen.
  const legacyValue = (option as unknown as { value?: string | null })?.value ?? null;
  const displayValue = option.effectiveValue ?? legacyValue ?? "–";

  return (
    <tr className={`transition ${trClass}`}>
      <td className="px-3 py-1 font-mono">{option.code}</td>
      <td className="px-3 py-1">{option.name ?? "–"}</td>
      <td className="px-3 py-1 font-mono">{displayValue}</td>
      <td className="px-3 py-1">
        {option.optionSpace ? option.optionSpace.name : "–"}
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
