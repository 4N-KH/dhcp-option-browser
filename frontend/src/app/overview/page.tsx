'use client';

import React, { useEffect, useState } from "react";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import LightTreeView from "@/features/dhcp-tree/LightTreeView";
import DhcpPropertiesPanel from "@/features/dhcp-tree/DhcpPropertiesPanel";
import { getDefaultSelection } from "@/features/dhcp-tree/helpers/tree-node-helpers";
import { TreeSelection } from "@/types/types";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import ImportWithProgress from "@/features/config-import/ImportWithProgress";
import OptionOverviewTab from "./option-overview-tab";

export default function OverviewPage() {
  const [tree, setTree] = useState<DhcpLightTreeDto | null>(null);
  const [selected, setSelected] = useState<TreeSelection | null>(null);
  const [tab, setTab] = useState<"tree" | "overview">("tree");
  const [loading, setLoading] = useState(true);

  // load DHCP tree once
  useEffect(() => {
    fetchDhcpLightTree()
      .then((data: DhcpLightTreeDto) => {
        if (data && data.ipSpaces) {
          setTree(data);
          if (data.ipSpaces.length > 0) {
            setSelected(getDefaultSelection(data));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-xl text-blue-300">
        Loading data...
      </div>
    );
  }

  // no data present
  if (!tree || !tree.ipSpaces || tree.ipSpaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <p className="text-gray-400 text-xl mb-6">No data available</p>
        {/* sync button */}
        <ImportWithProgress
          onComplete={async () => {
            const newTree = await fetchDhcpLightTree();
            setTree(newTree);
            if (newTree && newTree.ipSpaces?.length) {
              setSelected(getDefaultSelection(newTree));
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[80vh] w-full">
      {/* header with tabs and sync */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <button
            className={`px-6 py-2 rounded-lg font-bold transition ${
              tab === "tree"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("tree")}
          >
            DHCP Tree
          </button>
          <button
            className={`px-6 py-2 rounded-lg font-bold transition ${
              tab === "overview"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("overview")}
          >
            Option Overview
          </button>
        </div>
        {/* manual synchronize only */}
        <ImportWithProgress
          onComplete={async () => {
            const updatedTree = await fetchDhcpLightTree();
            setTree(updatedTree);
            if (updatedTree && updatedTree.ipSpaces?.length) {
              setSelected(getDefaultSelection(updatedTree));
            }
          }}
        />
      </div>

      {/* main view */}
      <div className="flex-1 w-full h-full overflow-hidden">
        {tab === "tree" ? (
          <div className="flex h-full w-full">
            <div className="w-1/3 min-w-[340px] max-w-[480px] border-r border-[var(--border)] bg-[rgba(255,255,255,0.02)] overflow-y-auto">
              <LightTreeView tree={tree} selected={selected} onSelect={setSelected} />
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <DhcpPropertiesPanel selected={selected} />
            </div>
          </div>
        ) : (
          <OptionOverviewTab />
        )}
      </div>
    </div>
  );
}
