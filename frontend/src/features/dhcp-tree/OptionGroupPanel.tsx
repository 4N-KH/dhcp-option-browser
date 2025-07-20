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

  return (
    <div className="mb-5 border border-blue-900 rounded-2xl bg-blue-950/50 shadow">
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-blue-900/30 rounded-t-2xl transition"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-200 text-lg">{group.name}</span>
          {status === "GROUP_INHERITED" ? (
            <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10">
              {getInheritedLabel(
                originLevel || group.groupOriginLevel,
                originLevelLabel || group.originLevelLabel,
                originLevelId || group.groupOriginLevelId
              )}
            </span>
          ) : (
            <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10">
              Explicit
            </span>
          )}
          {group.comment && (
            <span className="text-xs text-gray-400 ml-2">{group.comment}</span>
          )}
        </div>
        <button
          className="text-xs px-3 py-1 rounded bg-blue-800 text-blue-200 shadow hover:bg-blue-700 transition"
          tabIndex={-1}
        >
          {open ? "Hide Options" : "Show Options"}
        </button>
      </div>
      {open && (
        <div className="pb-2 px-4">
          <div className="overflow-x-auto rounded-b-2xl bg-blue-950/70">
            <table className="min-w-[750px] w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-blue-200 uppercase text-xs font-bold border-b border-blue-900">
                  <th className="py-2 px-3 text-left">Code</th>
                  <th className="py-2 px-3 text-left">Name</th>
                  <th className="py-2 px-3 text-left">Value</th>
                  <th className="py-2 px-3 text-left">Option Space</th>
                  <th className="py-2 px-3 text-left">Type</th>
                  <th className="py-2 px-3 text-left">Comment</th>
                </tr>
              </thead>
              <tbody>
                {options.length > 0 ? options.map((opt, i) => (
                  <tr key={opt.code} className={i % 2 === 0 ? "bg-blue-950/40" : ""}>
                    <td className="font-mono px-3 py-1">{opt.code}</td>
                    <td className="px-3 py-1">{opt.name ?? "–"}</td>
                    <td className="px-3 py-1">{opt.value ?? "–"}</td>
                    <td className="px-3 py-1">
                      {opt.optionSpace
                        ? `${opt.optionSpace.name}${opt.optionSpace.protocol ? " (" + opt.optionSpace.protocol + ")" : ""}`
                        : "–"}
                    </td>
                    <td className="px-3 py-1">{opt.type ?? "–"}</td>
                    <td className="px-3 py-1">{opt.optionCodeComment ?? "–"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-gray-500 py-2 text-center">No options in this group</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionGroupPanel;
