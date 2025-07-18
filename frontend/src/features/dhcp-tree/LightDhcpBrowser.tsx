"use client";
import React, { useState } from "react";
import { useDhcpHierarchy } from "@/hooks/useDhcpHierarchy";
import LightTreeView from "./LightTreeView";
import DhcpPropertiesPanel from "./DhcpPropertiesPanel";
import { getDefaultSelection } from "./helpers";
import { TreeSelection } from "./types";
import ImportWithProgress from "../config-import/ImportWithProgress";

const LightDhcpBrowser: React.FC = () => {
  const { data, isLoading, error } = useDhcpHierarchy();
  const [selected, setSelected] = useState<TreeSelection | null>(null);

  // Only set default selection once data is available
  React.useEffect(() => {
    if (data && !selected) setSelected(getDefaultSelection(data));
  }, [data, selected]);

  if (isLoading) {
    return (
      <div className="flex items-centre justify-centre min-h-[70vh] text-2xl text-[var(--accent)]">
        Loading DHCP data…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-centre justify-centre min-h-[70vh] text-lg text-[var(--danger)]">
        Error whilst loading data: {(error as Error).message}
        <div className="mt-6">
          <ImportWithProgress />
        </div>
      </div>
    );
  }
  if (!data) {
    // No data – offer import
    return (
      <div className="flex flex-col items-centre justify-centre min-h-[70vh]">
        <ImportWithProgress autoStart />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-[85vh] px-4 py-6 overflow-hidden bg-[var(--background)]">
      {/* Tree (left) */}
      <div className="w-full md:w-1/3 max-w-[410px] min-w-[250px] bg-[var(--accent-light)]/30 rounded-2xl shadow-lg overflow-y-auto">
        <LightTreeView
          tree={data}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
      {/* Panels (right) */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 bg-[rgba(17,24,39,0.45)] rounded-2xl shadow-lg p-6 overflow-y-auto">
        <div className="flex flex-col h-full">
          <DhcpPropertiesPanel selected={selected} />
          {/* <DhcpOptionsPanel selected={selected} /> */}
        </div>
      </div>
    </div>
  );
};

export default LightDhcpBrowser;
