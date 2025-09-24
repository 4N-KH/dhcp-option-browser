import React, { useState } from "react";
import { OptionGroupInSource } from "@/types/dto/effective-dhcp-option-slim.dto";
import { getInheritedLabel } from "./helpers/labels";
import { getSolidByCode } from "./OptionRowHelpers";

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
  const [open, setOpen] = useState(false);
  const groupIsRedundant = options.some((o) => o.redundant);

  const effLevel = group.groupOriginLevel ?? originLevel;
  const effLabel = group.originLevelLabel ?? originLevelLabel;
  const effId = group.groupOriginLevelId ?? originLevelId;

  // Inheritance badge (either inherited or explicit)
  const inheritedBadge =
    status === "GROUP_INHERITED" ? (
      <span
        className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold"
        title={(effLabel ?? "") + (effId ? " #" + effId : "")}
      >
        {getInheritedLabel(effLevel, effLabel, effId)}
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
        groupIsRedundant ? "border-red-700" : "",
      ].join(" ")}
    >
      {/* Header section with group name and controls */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-200">{group.name}</span>
          {groupIsRedundant && (
            <span className="bg-red-800 text-red-100 px-2 py-0.5 rounded text-xs font-semibold">
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

      {/* Option list (visible when open) */}
      {open && (
        <div className="pb-2 px-4">
          <table className="w-full text-sm mt-1">
            <thead>
              <tr>
                <th className="py-2 px-2 text-left">Code</th>
                <th className="py-2 px-2 text-left">Name</th>
                <th className="py-2 px-2 text-left">Value</th>
                <th className="py-2 px-2 text-left">Type</th>
                <th className="py-2 px-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {options.length ? (
                options.map((opt, idx) => {
                  const isRedundant = opt.redundant === true;
                  const tone = isRedundant ? getSolidByCode(opt.code) : null;

                  return (
                    <tr
                      key={`${opt.code}-${opt.value}-${idx}`}
                      className={[
                        "transition",
                        isRedundant
                          ? `${tone!.bg} ${tone!.text} font-semibold` // <-- no animate-pulse anymore
                          : "hover:bg-white/5",
                      ].join(" ")}
                      title={isRedundant ? "Redundant" : undefined}
                    >
                      {/* Code is shown mono-style */}
                      <td className="py-1 px-2 font-mono">{opt.code}</td>
                      <td className="py-1 px-2">{opt.name ?? "–"}</td>
                      <td className="py-1 px-2 font-mono">
                        {opt.value ?? "–"}
                      </td>
                      <td className="py-1 px-2">{opt.type ?? "–"}</td>
                      <td className="py-1 px-2">
                        {isRedundant && (
                          <span className="ml-2 bg-red-800 text-red-100 px-2 py-0.5 rounded text-xs font-semibold">
                            Redundant
                          </span>
                        )}
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
