'use client';

import React, { useEffect, useState } from "react";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import LightTreeView, { type NodeKey as TreeNodeKey } from "@/features/dhcp-tree/LightTreeView";
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

/* ---------------- safe helpers for optional arrays ---------------- */

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function getAddressBlocks(ip: LightIpSpaceDto): LightAddressBlockDto[] {
  return arr<LightAddressBlockDto>((ip as unknown as { addressBlocks?: unknown }).addressBlocks);
}
function getSubnets(ab: LightAddressBlockDto): LightSubnetDto[] {
  return arr<LightSubnetDto>((ab as unknown as { subnets?: unknown }).subnets);
}
function getRanges(sn: LightSubnetDto): LightRangeDto[] {
  return arr<LightRangeDto>((sn as unknown as { ranges?: unknown }).ranges);
}
function getFixedUnderIpSpace(ip: LightIpSpaceDto): LightFixedAddressDto[] {
  return arr<LightFixedAddressDto>((ip as unknown as { fixedAddresses?: unknown }).fixedAddresses);
}
function getFixedUnderAddressBlock(ab: LightAddressBlockDto): LightFixedAddressDto[] {
  return arr<LightFixedAddressDto>((ab as unknown as { fixedAddresses?: unknown }).fixedAddresses);
}
function getFixedUnderSubnet(sn: LightSubnetDto): LightFixedAddressDto[] {
  return arr<LightFixedAddressDto>((sn as unknown as { fixedAddresses?: unknown }).fixedAddresses);
}
function getFixedUnderRange(rg: LightRangeDto): LightFixedAddressDto[] {
  return arr<LightFixedAddressDto>((rg as unknown as { fixedAddresses?: unknown }).fixedAddresses);
}

/* ---------------- key helpers (MUST MATCH LightTreeView) ---------------- */

type NT = Exclude<RedundancyLevel, "global">; // navigable node types
type KeyStr = string;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function rd(o: unknown, k: string): unknown {
  return isObj(o) ? o[k] : undefined;
}
function s(v: unknown): string | null {
  if (typeof v === "string" && v) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Build the SAME stable key id as LightTreeView.stableIdFor */
function stableIdForSelection(sel: TreeSelection): string {
  const t = sel.type as TreeNodeKey["type"];
  const o = sel.object as unknown;

  const rawId = s(rd(o, "id"));
  if (rawId) return rawId;

  switch (t) {
    case "ipSpace":
      return s(rd(o, "name")) ?? "ipSpace:unknown";
    case "addressBlock":
      return s(rd(o, "address")) ?? s(rd(o, "name")) ?? "addressBlock:unknown";
    case "subnet":
      return s(rd(o, "address")) ?? "subnet:unknown";
    case "range": {
      const sid = s(rd(o, "subnetId")) ?? s(rd(rd(o, "subnet"), "id")) ?? "?:";
      const start = s(rd(o, "start")) ?? s(rd(o, "from")) ?? "start?";
      const end = s(rd(o, "end")) ?? s(rd(o, "to")) ?? "end?";
      return `${sid}:${start}-${end}`;
    }
    case "fixedAddress": {
      const sid =
        s(rd(o, "subnetId")) ??
        s(rd(rd(o, "subnet"), "id")) ??
        s(rd(rd(o, "range"), "subnetId")) ??
        "?:";
      const addr = s(rd(o, "address")) ?? s(rd(o, "name")) ?? "addr?";
      return `${sid}:${addr}`;
    }
    case "global":
    default:
      return "root";
  }
}
const keyStrOfSelection = (sel: TreeSelection): KeyStr =>
  `${sel.type}:${stableIdForSelection(sel)}`;

/* ---------------- index builder: parent map + id lookup ---------------- */

function buildIndex(tree: DhcpLightTreeDto) {
  const parent = new Map<KeyStr, KeyStr | null>();
  const nodeByKey = new Map<KeyStr, TreeSelection>();
  const idToKey = new Map<KeyStr, KeyStr>();

  const rootKey: KeyStr = "global:root";
  parent.set(rootKey, null);

  const indexSel = (sel: TreeSelection, parentKey: KeyStr) => {
    const key = keyStrOfSelection(sel);
    if (!parent.has(key)) parent.set(key, parentKey);
    nodeByKey.set(key, sel);

    const idVal = rd(sel.object as unknown, "id");
    if (typeof idVal === "number" || typeof idVal === "string") {
      idToKey.set(`${sel.type}:${String(idVal)}`, key);
    }
  };

  for (const ip of (tree.ipSpaces ?? []) as LightIpSpaceDto[]) {
    const ipSel: TreeSelection = { type: "ipSpace", object: ip };
    indexSel(ipSel, rootKey);

    // optional fixed under ipSpace
    for (const fa of getFixedUnderIpSpace(ip)) {
      indexSel({ type: "fixedAddress", object: fa }, keyStrOfSelection(ipSel));
    }

    // address blocks
    for (const ab of getAddressBlocks(ip)) {
      const abSel: TreeSelection = { type: "addressBlock", object: ab };
      indexSel(abSel, keyStrOfSelection(ipSel));

      // fixed under addressBlock
      for (const fa of getFixedUnderAddressBlock(ab)) {
        indexSel({ type: "fixedAddress", object: fa }, keyStrOfSelection(abSel));
      }

      // subnets
      for (const sn of getSubnets(ab)) {
        const snSel: TreeSelection = { type: "subnet", object: sn };
        indexSel(snSel, keyStrOfSelection(abSel));

        // ranges
        for (const rg of getRanges(sn)) {
          const rgSel: TreeSelection = { type: "range", object: rg };
          indexSel(rgSel, keyStrOfSelection(snSel));

          // fixed under range
          for (const fa of getFixedUnderRange(rg)) {
            indexSel({ type: "fixedAddress", object: fa }, keyStrOfSelection(rgSel));
          }
        }

        // fixed under subnet
        for (const fa of getFixedUnderSubnet(sn)) {
          indexSel({ type: "fixedAddress", object: fa }, keyStrOfSelection(snSel));
        }
      }
    }
  }

  return { parent, nodeByKey, idToKey, rootKey };
}

/* ---------------- path & selection using index (stable keys) ---------------- */

function pathFromIndex(
  parent: Map<KeyStr, KeyStr | null>,
  idToKey: Map<KeyStr, KeyStr>,
  type: NT,
  id: number
): TreeNodeKey[] {
  const keyStart = idToKey.get(`${type}:${String(id)}`);
  if (!keyStart) return [];

  const rev: TreeNodeKey[] = [];
  let cur: KeyStr | null | undefined = keyStart;
  let guard = 0;

  while (cur && guard++ < 4000) {
    const [t, ...rest] = cur.split(":");
    const restJoined = rest.join(":"); // supports composite stable ids with colons
    if (t !== "global") {
      rev.push({ type: t as TreeNodeKey["type"], id: restJoined });
    }
    cur = parent.get(cur) ?? null;
  }

  return rev.reverse();
}

function selectionFromIndex(
  nodeByKey: Map<KeyStr, TreeSelection>,
  idToKey: Map<KeyStr, KeyStr>,
  type: NT,
  id: number
): TreeSelection | null {
  const key = idToKey.get(`${type}:${String(id)}`);
  return key ? nodeByKey.get(key) ?? null : null;
}

/* ---------------- component ---------------- */

export default function OverviewPage() {
  const [tree, setTree] = useState<DhcpLightTreeDto | null>(null);
  const [selected, setSelected] = useState<TreeSelection | null>(null);
  const [tab, setTab] = useState<"tree" | "overview" | "groups" | "redundancies">("tree");
  const [loading, setLoading] = useState(true);
  const [autoExpandPath, setAutoExpandPath] = useState<TreeNodeKey[] | null>(null);

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

    if (level === "global") {
      setSelected({ type: "global", object: tree });
      setAutoExpandPath(null);
      return;
    }

    // Build index once per jump – ensures exact mapping for ALL object IDs.
    const { parent, nodeByKey, idToKey } = buildIndex(tree);

    const sel = selectionFromIndex(nodeByKey, idToKey, level as NT, objectId);
    const path = pathFromIndex(parent, idToKey, level as NT, objectId);

    if (sel) setSelected(sel);
    if (path.length) setAutoExpandPath(path);
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
