import React, { useState } from "react";
import { OptionGroupInSource } from "@/types/dto/effective-dhcp-option-slim.dto";
import { getInheritedLabel } from "./helpers/labels";

interface OptionGroupPanelProps {
  group: OptionGroupInSource;
  status: "GROUP_EXPLICIT" | "GROUP_INHERITED";
  originLevel?: string;
  originLevelLabel?: string;
  originLevelId?: number;
  options: OptionGroupInSource["options"];
  partnerKeys?: Set<string>;
}

const OptionGroupPanel: React.FC<OptionGroupPanelProps> = ({
  group,
  status,
  originLevel,
  originLevelLabel,
  originLevelId,
  options,
}) => {
  const [open, setOpen] = useState(false); // Controls expand/collapse state

  const groupIsRedundant = options.some((opt) => opt.redundant); // Group flagged if any option is redundant

  // Resolve origin info with fallback (from props if not present in group)
  const effectiveOriginLevel = group.groupOriginLevel ?? originLevel;
  const effectiveOriginLevelLabel = group.originLevelLabel ?? originLevelLabel;
  const effectiveOriginLevelId = group.groupOriginLevelId ?? originLevelId;

  // Badge indicating inheritance or explicit status
  const inheritedBadge = status === "GROUP_INHERITED" ? (
    <span
      className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold"
      title={
        (effectiveOriginLevelLabel ?? "") +
        (effectiveOriginLevelId ? " #" + effectiveOriginLevelId : "")
      }
    >
      {getInheritedLabel(
        effectiveOriginLevel,
        effectiveOriginLevelLabel,
        effectiveOriginLevelId
      )}
    </span>
  ) : (
    <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-semibold">
      Explicit
    </span>
  );

  return (
    <div
      className={[
        "mb-4 border border-blue-900 rounded-lg bg-blue-950/30",
        groupIsRedundant
          ? "border-red-700 shadow-[0_0_0_2px_rgba(220,38,38,0.4)]"
          : "",
      ].join(" ")}
    >
      {/* Header row with group name, badges, and toggle */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-200">{group.name}</span>
          {groupIsRedundant && (
            <span className="bg-red-800 text-red-100 px-2 py-0.5 rounded text-xs font-semibold shadow-sm">
              Redundant in group
            </span>
          )}
          {inheritedBadge}
          {group.comment && (
            <span className="text-xs text-gray-400 ml-2">{group.comment}</span>
          )}
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded bg-blue-800 text-blue-200"
          tabIndex={-1}
        >
          {open ? "Hide Options" : "Show Options"}
        </button>
      </div>

      {/* Expandable section showing options table */}
      {open && (
        <div className="pb-2 px-4">
          <table className="w-full text-sm mt-1">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Value</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {options.length > 0 ? (
                options.map((opt, idx) => {
                  const isRedundant = opt.redundant === true;
                  return (
                    <tr
                      key={`${opt.code}-${opt.value}-${idx}`}
                      className={[
                        isRedundant
                          ? "bg-red-900/80 text-red-200 font-bold animate-pulse"
                          : "",
                      ].join(" ")}
                      title={isRedundant ? "Redundant" : undefined}
                    >
                      <td className="font-mono">{opt.code}</td>
                      <td>{opt.name ?? "–"}</td>
                      <td>{opt.value ?? "–"}</td>
                      <td>{opt.type ?? "–"}</td>
                      <td>
                        {isRedundant && (
                          <span className="ml-2 bg-red-800 text-red-100 px-2 py-0.5 rounded text-xs font-semibold">
                            Redundant
                          </span>
                        )}
                        {/* Partner badge intentionally omitted */}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-gray-500 py-2 text-center">
                    No options in this group
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OptionGroupPanel;
