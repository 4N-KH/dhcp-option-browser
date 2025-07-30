'use client';

import React, { useEffect, useState } from "react";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import LightTreeView from "@/features/dhcp-tree/LightTreeView";
import DhcpPropertiesPanel from "@/features/dhcp-tree/DhcpPropertiesPanel";
import { getDefaultSelection } from "@/features/dhcp-tree/helpers/tree-node-helpers";
import { TreeSelection } from "@/types/types";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import ImportWithProgress from "@/features/config-import/ImportWithProgress";
import OptionOverviewTab from "./option-overview-tab"; // <--- NEU! (siehe oben)

export default function OverviewPage() {
  const [tree, setTree] = useState<DhcpLightTreeDto | null>(null);
  const [selected, setSelected] = useState<TreeSelection | null>(null);
  const [showTree, setShowTree] = useState(false);
  const [tab, setTab] = useState<"tree" | "overview">("tree");

  // Fetch existing data immediately after login/reload
  useEffect(() => {
    fetchDhcpLightTree().then((data: DhcpLightTreeDto) => {
      if (data && data.ipSpaces?.length) {
        setTree(data);
      }
    });
  }, []);

  if (showTree && tree) {
    return (
      <div className="flex flex-col h-[80vh] w-full">
        {/* Tabs */}
        <div className="flex gap-4 mb-4">
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
        {/* Tab Content */}
        <div className="flex-1 w-full h-full overflow-hidden">
          {tab === "tree" ? (
            <div className="flex h-full w-full">
              {/* Sidebar: Tree */}
              <div className="w-1/3 min-w-[340px] max-w-[480px] border-r border-[var(--border)] bg-[rgba(255,255,255,0.02)] overflow-y-auto">
                <LightTreeView
                  tree={tree}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
              {/* Main: Properties panel */}
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

  // Default: Import/overview choice UI
  return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <h2 className="text-2xl font-bold mb-6">DHCP Data Import</h2>
      <div className="flex gap-8 items-center w-full max-w-2xl mb-2">
        {/* Import-Button in Wrapper */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-[320px]">
            <ImportWithProgress
              onComplete={async () => {
                const newTree = await fetchDhcpLightTree();
                setTree(newTree);
                setSelected(newTree ? getDefaultSelection(newTree) : null);
                setShowTree(true);
              }}
            />
          </div>
        </div>
        {/* Overview-Button in Wrapper */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => {
              setShowTree(true);
              if (tree) setSelected(getDefaultSelection(tree));
            }}
            className="w-full max-w-[320px] min-h-[60px] bg-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-semibold shadow text-lg transition"
            disabled={!tree}
          >
            Go to Overview
          </button>
        </div>
      </div>
      <p className="text-gray-400 mt-4 max-w-xl text-center">
        Import new DHCP data or proceed to the overview to see the currently stored configuration.
        <br />
        <span className="text-sm opacity-70">
          After reloading the page, you do <b>not</b> need to re-import!
        </span>
      </p>
    </div>
  );
}
