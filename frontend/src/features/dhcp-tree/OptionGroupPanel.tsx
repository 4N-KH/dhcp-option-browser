import React, { useState } from "react";
import { OptionGroupInSource } from "@/types/dto/effective-dhcp-option-slim.dto";
import { StatusBadge } from "./OptionRowHelpers";
import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";

interface OptionGroupPanelProps {
  group: OptionGroupInSource;
  status: "GROUP_EXPLICIT" | "GROUP_INHERITED";
  originLevel?: string;
  options: EffectiveDhcpOptionSlimDto[];
}

const OptionGroupPanel: React.FC<OptionGroupPanelProps> = ({
  group,
  status,
  originLevel,
  options,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 border border-blue-900 rounded-lg bg-blue-950/30">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-200">{group.name}</span>
          <StatusBadge status={status} originLevel={originLevel} />
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
      {open && (
        <div className="pb-2 px-4">
          <table className="w-full text-sm mt-1">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Value</th>
                <th>Option Space</th>
                <th>Type</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {options.length > 0 ? options.map((opt) => (
                <tr key={opt.code}>
                  <td className="font-mono">{opt.code}</td>
                  <td>{opt.name ?? "–"}</td>
                  <td>{opt.effectiveValue ?? "–"}</td>
                  <td>
                    {opt.optionSpace
                      ? `${opt.optionSpace.name}${opt.optionSpace.protocol ? " (" + opt.optionSpace.protocol + ")" : ""}`
                      : "–"}
                  </td>
                  <td>{opt.type ?? "–"}</td>
                  <td>{opt.optionCodeComment ?? "–"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-gray-500 py-2 text-center">No options in this group</td>
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
