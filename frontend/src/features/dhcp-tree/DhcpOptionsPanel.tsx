import React, { useMemo } from "react";
import { EffectiveDhcpOptionSlimDto, OptionGroupInSource } from "@/types/dto/effective-dhcp-option-slim.dto";
import OptionGroupPanel from "./OptionGroupPanel";
import { DhcpOptionRow } from "./OptionRowHelpers";

interface DhcpOptionsPanelProps {
  loading: boolean;
  options: EffectiveDhcpOptionSlimDto[] | null;
  error?: string | null;
}

type GroupPanelMeta = {
  group: OptionGroupInSource;
  status: "GROUP_EXPLICIT" | "GROUP_INHERITED";
  originLevel?: string;
  originLevelId?: number;
  originLevelLabel?: string;
};

const DhcpOptionsPanel: React.FC<DhcpOptionsPanelProps> = ({
  loading,
  options,
  error,
}) => {
  const { directOptions, groupPanels } = useMemo(() => {
    if (!options) return { directOptions: [], groupPanels: [] as GroupPanelMeta[] };

    const directOptions: EffectiveDhcpOptionSlimDto[] = [];
    const groupMap = new Map<number, GroupPanelMeta>();

    // 1. Sammle alle Group-Metadaten (auch leere Gruppen)
    for (const opt of options) {
      const group = opt.source.optionGroup;
      if (group && typeof group.id === "number") {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, {
            group,
            status: (group.groupInheritanceType || opt.source.type) as "GROUP_EXPLICIT" | "GROUP_INHERITED",
            originLevel: group.groupOriginLevel || opt.source.originLevel,
            originLevelId: group.groupOriginLevelId || opt.source.originLevelId,
            originLevelLabel: group.originLevelLabel, // <<< Hier direkt vom Backend
          });
        }
      }
    }

    // 2. Direkte Optionen (nicht aus einer Gruppe)
    for (const opt of options) {
      const group = opt.source.optionGroup;
      if (!group || typeof group.id !== "number") {
        directOptions.push(opt);
      }
    }

    return { directOptions, groupPanels: Array.from(groupMap.values()) };
  }, [options]);

  if (loading)
    return <div className="p-6 text-lg text-blue-400">Loading options…</div>;
  if (error)
    return <div className="p-6 text-lg text-red-400">Error: {error}</div>;
  if (!options || (directOptions.length === 0 && groupPanels.length === 0))
    return <div className="p-6 text-gray-400">No options found for this object.</div>;

  return (
    <div className="bg-blue-950/40 rounded-xl p-6 shadow-sm min-h-[120px] mt-2 overflow-x-auto">
      {/* Direct Options */}
      <div className="mb-8">
        <div className="text-blue-300 font-semibold mb-2 text-base">Direct Options</div>
        <table className="w-full text-sm border-separate border-spacing-y-1 mb-2">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Eff. Value</th>
              <th>Option Space</th>
              <th>Type</th>
              <th>Status</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {directOptions.length > 0 ? directOptions.map((opt) => (
              <DhcpOptionRow key={opt.code} option={opt} />
            )) : (
              <tr>
                <td colSpan={7} className="text-gray-500 py-2 text-center">No direct options</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Option Groups */}
      <div>
        <div className="text-blue-300 font-semibold mb-2 text-base">Option Groups</div>
        {groupPanels.length > 0 ? groupPanels.map(({ group, status, originLevel, originLevelLabel }) => (
          <OptionGroupPanel
            key={group.id}
            group={group}
            status={status}
            originLevel={originLevel}
            originLevelLabel={originLevelLabel}
            options={group.options}
          />
        )) : (
          <div className="text-gray-500 py-2 px-4">No option groups</div>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-3 ml-2">
        Tip: Click a group to expand. Status (Explicit / Inherited / Overridden) is shown for each group.
      </div>
    </div>
  );
};

export default DhcpOptionsPanel;
