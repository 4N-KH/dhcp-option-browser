'use client';

import React, { useEffect, useState } from "react";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import LightTreeView from "@/features/dhcp-tree/LightTreeView";
import DhcpPropertiesPanel from "@/features/dhcp-tree/DhcpPropertiesPanel";
import { getDefaultSelection } from "@/features/dhcp-tree/helpers/tree-node-helpers";
import { TreeSelection } from "@/types/types";
import {
  DhcpLightTreeDto,
  LightIpSpaceDto,
  LightAddressBlockDto,
  LightSubnetDto,
  LightRangeDto,
  LightFixedAddressDto,
} from "@/types/dto/dhcp-light-tree.dto";
import ImportWithProgress from "@/features/config-import/ImportWithProgress";
import OptionOverviewTab from "./option-overview-tab";
import RedundancyOverviewPanel from "@/features/redundancy/RedundancyOverviewPanel";
import OptionGroupOverviewPanel from "@/features/option-view/OptionGroupOverviewPanel";
import { RedundancyLevel } from "@/types/dto/redundancy-overview-item.dto";

// Safe access for optional fixed addresses on address blocks
function getFixedUnderAddressBlock(ab: LightAddressBlockDto): LightFixedAddressDto[] {
  const possible = (ab as unknown as { fixedAddresses?: unknown }).fixedAddresses;
  return Array.isArray(possible) ? (possible as LightFixedAddressDto[]) : [];
}

// Build ancestor path from root to target node
type NodeKey = { type: "ipSpace" | "addressBlock" | "subnet" | "range" | "fixedAddress"; id: number };

function buildPath(
  tree: DhcpLightTreeDto,
  level: Exclude<RedundancyLevel, "global">,
  id: number
): NodeKey[] {
  const path: NodeKey[] = [];

  for (const ip of (tree.ipSpaces ?? []) as LightIpSpaceDto[]) {
    const pushIp = () => path.push({ type: "ipSpace", id: ip.id });
    if (level === "ipSpace" && ip.id === id) {
      pushIp();
      return path;
    }

    for (const ab of (ip.addressBlocks ?? []) as LightAddressBlockDto[]) {
      const pushAb = () => {
        pushIp();
        path.push({ type: "addressBlock", id: ab.id });
      };
      if (level === "addressBlock" && ab.id === id) {
        pushAb();
        return path;
      }

      for (const sn of (ab.subnets ?? []) as LightSubnetDto[]) {
        const pushSn = () => {
          pushAb();
          path.push({ type: "subnet", id: sn.id });
        };
        if (level === "subnet" && sn.id === id) {
          pushSn();
          return path;
        }

        for (const rg of (sn.ranges ?? []) as LightRangeDto[]) {
          if (level === "range" && rg.id === id) {
            pushSn();
            path.push({ type: "range", id: rg.id });
            return path;
          }
        }

        for (const fa of (sn.fixedAddresses ?? []) as LightFixedAddressDto[]) {
          if (level === "fixedAddress" && fa.id === id) {
            pushSn();
            path.push({ type: "fixedAddress", id: fa.id });
            return path;
          }
        }
      }

      for (const fa of getFixedUnderAddressBlock(ab)) {
        if (level === "fixedAddress" && fa.id === id) {
          pushAb();
          path.push({ type: "fixedAddress", id: fa.id });
          return path;
        }
      }
    }
  }

  return path;
}

// Find the concrete object for selection
function findSelection(
  tree: DhcpLightTreeDto,
  level: Exclude<RedundancyLevel, "global">,
  id: number
): TreeSelection | null {
  for (const ip of (tree.ipSpaces ?? []) as LightIpSpaceDto[]) {
    if (level === "ipSpace" && ip.id === id) return { type: "ipSpace", object: ip };

    for (const ab of (ip.addressBlocks ?? []) as LightAddressBlockDto[]) {
      if (level === "addressBlock" && ab.id === id) return { type: "addressBlock", object: ab };

      for (const sn of (ab.subnets ?? []) as LightSubnetDto[]) {
        if (level === "subnet" && sn.id === id) return { type: "subnet", object: sn };

        for (const rg of (sn.ranges ?? []) as LightRangeDto[]) {
          if (level === "range" && rg.id === id) return { type: "range", object: rg };
        }
        for (const fa of (sn.fixedAddresses ?? []) as LightFixedAddressDto[]) {
          if (level === "fixedAddress" && fa.id === id) return { type: "fixedAddress", object: fa };
        }
      }

      for (const fa of getFixedUnderAddressBlock(ab)) {
        if (level === "fixedAddress" && fa.id === id) return { type: "fixedAddress", object: fa };
      }
    }
  }
  return null;
}

export default function OverviewPage() {
  const [tree, setTree] = useState<DhcpLightTreeDto | null>(null);
  const [selected, setSelected] = useState<TreeSelection | null>(null);
  const [tab, setTab] = useState<"tree" | "overview" | "groups" | "redundancies">("tree");
  const [loading, setLoading] = useState(true);
  const [autoExpandPath, setAutoExpandPath] = useState<NodeKey[] | null>(null);

  useEffect(() => {
    fetchDhcpLightTree()
      .then((data) => {
        if (data?.ipSpaces) {
          setTree(data);
          if (data.ipSpaces.length > 0) setSelected(getDefaultSelection(data));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleJumpToTree = (level: RedundancyLevel, objectId: number) => {
    setTab("tree");
    if (!tree) return;
    if (level !== "global") {
      const sel = findSelection(tree, level, objectId);
      const path = buildPath(tree, level, objectId);
      if (sel) setSelected(sel);
      if (path.length) setAutoExpandPath(path);
    }
  };

  const onImportComplete = async () => {
    const updated = await fetchDhcpLightTree();
    setTree(updated);
    if (updated?.ipSpaces?.length) setSelected(getDefaultSelection(updated));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-xl text-blue-300">
        Loading data...
      </div>
    );
  }

  if (!tree || !tree.ipSpaces || tree.ipSpaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <p className="text-gray-400 text-xl mb-6">No data available</p>
        <ImportWithProgress onComplete={onImportComplete} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[80vh] w-full">
      {/* Header with tab buttons and import control */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex gap-4">
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "tree" ? "bg-[var(--accent)] text-white" : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("tree")}
          >
            DHCP Tree
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "overview" ? "bg-[var(--accent)] text-white" : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("overview")}
          >
            Option Overview
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "groups" ? "bg-[var(--accent)] text-white" : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("groups")}
          >
            Group Overview
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "redundancies" ? "bg-[var(--accent)] text-white" : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("redundancies")}
          >
            Redundancies
          </button>
        </div>
        <ImportWithProgress onComplete={onImportComplete} />
      </div>

      <div className="flex-1 w-full h-full overflow-hidden">
        {tab === "tree" ? (
          <div className="flex h-full w-full">
            <div className="w-1/3 min-w-[340px] max-w-[480px] border-r border-[var(--border)] bg-[rgba(255,255,255,0.02)] overflow-y-auto">
              <LightTreeView
                tree={tree}
                selected={selected}
                onSelect={setSelected}
                autoExpandPath={autoExpandPath}
                onAutoExpandConsumed={() => setAutoExpandPath(null)}
              />
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <DhcpPropertiesPanel selected={selected} />
            </div>
          </div>
        ) : tab === "overview" ? (
          <OptionOverviewTab />
        ) : tab === "groups" ? (
          <OptionGroupOverviewPanel />
        ) : (
          <RedundancyOverviewPanel onJump={handleJumpToTree} />
        )}
      </div>
    </div>
  );
}
