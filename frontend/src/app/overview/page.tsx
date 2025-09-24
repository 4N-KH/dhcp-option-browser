"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import LightTreeView, {
  type NodeKey as TreeNodeKey,
} from "@/features/dhcp-tree/LightTreeView";
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

/* ---------------- optional hints coming from the redundancy panel ---------------- */
export type JumpHint = {
  name?: string; // e.g., "labor_vm"
  address?: string; // e.g., "10.10.0.0/24" OR "10.10.0.0"
  ipSpaceName?: string;
  subnetId?: number;
  start?: string;
  end?: string;
};

/* ---------------- inline search bar (no separate file) ---------------- */
function SearchBar({
  placeholder = "Find name, address/CIDR, IP or range…",
  onSearch,
  className = "",
}: {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.setAttribute("aria-label", "DHCP tree search");
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q.trim());
      }}
      className={`flex items-center gap-2 p-2 ${className}`}
    >
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)]"
      >
        Search
      </button>
    </form>
  );
}

/* ---------------- safe helpers for optional arrays ---------------- */
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const ipSpaceAddressBlocks = (ip: LightIpSpaceDto): LightAddressBlockDto[] =>
  arr<LightAddressBlockDto>(ip.addressBlocks);
const ipSpaceSubnets = (ip: LightIpSpaceDto): LightSubnetDto[] =>
  arr<LightSubnetDto>(ip.subnets);

const abChildren = (ab: LightAddressBlockDto): LightAddressBlockDto[] =>
  arr<LightAddressBlockDto>(ab.children);
const abSubnets = (ab: LightAddressBlockDto): LightSubnetDto[] =>
  arr<LightSubnetDto>(ab.subnets);

const subnetRanges = (sn: LightSubnetDto): LightRangeDto[] =>
  arr<LightRangeDto>(sn.ranges);
const subnetFixed = (sn: LightSubnetDto): LightFixedAddressDto[] =>
  arr<LightFixedAddressDto>(sn.fixedAddresses ?? []);
const rangeFixed = (rg: LightRangeDto): LightFixedAddressDto[] =>
  arr<LightFixedAddressDto>(rg.fixedAddresses);

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
    case "ipSpace": {
      return s(rd(o, "name")) ?? "ipSpace:unknown";
    }
    case "addressBlock": {
      const addr = s(rd(o, "address"));
      const cidr = s(rd(o, "cidr"));
      const combo = addr && cidr ? `${addr}/${cidr}` : null;
      return combo ?? s(rd(o, "name")) ?? "addressBlock:unknown";
    }
    case "subnet": {
      const addr = s(rd(o, "address"));
      const cidr = s(rd(o, "cidr"));
      const combo = addr && cidr ? `${addr}/${cidr}` : null;
      return combo ?? s(rd(o, "name")) ?? "subnet:unknown";
    }
    case "range": {
      const sid = s(rd(o, "subnetId")) ?? s(rd(rd(o, "subnet"), "id")) ?? "?:";
      const start = s(rd(o, "start")) ?? "start?";
      const end = s(rd(o, "end")) ?? "end?";
      return `${sid}:${start}-${end}`;
    }
    case "fixedAddress": {
      const sid =
        s(rd(o, "subnetId")) ??
        s(rd(rd(o, "range"), "subnetId")) ??
        s(rd(rd(o, "subnet"), "id")) ??
        "?:";
      const ip = s(rd(o, "ip")) ?? s(rd(o, "name")) ?? "ip?";
      return `${sid}:${ip}`;
    }
    case "global":
    default:
      return "root";
  }
}
const keyStrOfSelection = (sel: TreeSelection): KeyStr =>
  `${sel.type}:${stableIdForSelection(sel)}`;

/* ---------------- index builder: parent map + id & natural keys ---------------- */
function buildIndex(tree: DhcpLightTreeDto) {
  const parent = new Map<KeyStr, KeyStr | null>();
  const nodeByKey = new Map<KeyStr, TreeSelection>();
  const idToKey = new Map<KeyStr, KeyStr>();

  // natural keys (used for search & fallbacks)
  const ipSpaceByName = new Map<string, KeyStr>();
  const addressBlockByAddress = new Map<string, KeyStr>(); // accepts "addr" AND "addr/cidr"
  const addressBlockByName = new Map<string, KeyStr>();
  const subnetByAddress = new Map<string, KeyStr>(); // accepts "addr" AND "addr/cidr"
  const subnetByName = new Map<string, KeyStr>();
  const rangeByTuple = new Map<string, KeyStr>(); // `${subnetId}:${start}-${end}`
  const fixedByTuple = new Map<string, KeyStr>(); // `${subnetId}:${ip}`

  const rootKey: KeyStr = "global:root";
  parent.set(rootKey, null);

  const setId = (sel: TreeSelection, key: KeyStr) => {
    const idVal = rd(sel.object as unknown, "id");
    if (typeof idVal === "number" || typeof idVal === "string") {
      idToKey.set(`${sel.type}:${String(idVal)}`, key);
    }
  };

  const indexSel = (sel: TreeSelection, parentKey: KeyStr) => {
    const key = keyStrOfSelection(sel);
    if (!parent.has(key)) parent.set(key, parentKey);
    nodeByKey.set(key, sel);
    setId(sel, key);

    // register natural keys
    switch (sel.type) {
      case "ipSpace": {
        const name = s(rd(sel.object, "name"));
        if (name) ipSpaceByName.set(name, key);
        break;
      }
      case "addressBlock": {
        const addr = s(rd(sel.object, "address"));
        const cidr = s(rd(sel.object, "cidr"));
        const name = s(rd(sel.object, "name"));
        if (addr) {
          addressBlockByAddress.set(addr, key); // plain address
          if (cidr) addressBlockByAddress.set(`${addr}/${cidr}`, key); // addr/cidr
        }
        if (name) addressBlockByName.set(name, key);
        break;
      }
      case "subnet": {
        const addr = s(rd(sel.object, "address"));
        const cidr = s(rd(sel.object, "cidr"));
        const name = s(rd(sel.object, "name"));
        if (addr) {
          subnetByAddress.set(addr, key);
          if (cidr) subnetByAddress.set(`${addr}/${cidr}`, key);
        }
        if (name) subnetByName.set(name, key);
        break;
      }
      case "range": {
        const sid = s(rd(sel.object, "subnetId"));
        const start = s(rd(sel.object, "start"));
        const end = s(rd(sel.object, "end"));
        if (sid && start && end)
          rangeByTuple.set(`${sid}:${start}-${end}`, key);
        break;
      }
      case "fixedAddress": {
        const ip = s(rd(sel.object, "ip"));
        const sid =
          s(rd(sel.object, "subnetId")) ??
          s(rd(rd(sel.object, "range"), "subnetId"));
        if (sid && ip) fixedByTuple.set(`${sid}:${ip}`, key);
        break;
      }
    }
  };

  // Walk: IpSpace → AddressBlocks (recursively via children) + Subnets → Ranges + Fixeds
  const walkAddressBlock = (ab: LightAddressBlockDto, parentKey: KeyStr) => {
    const abSel: TreeSelection = { type: "addressBlock", object: ab };
    const abKey = keyStrOfSelection(abSel);
    indexSel(abSel, parentKey);

    // child address blocks
    for (const child of abChildren(ab)) {
      walkAddressBlock(child, abKey);
    }
    // subnets under block
    for (const sn of abSubnets(ab)) {
      walkSubnet(sn, abKey);
    }
  };

  const walkSubnet = (sn: LightSubnetDto, parentKey: KeyStr) => {
    const snSel: TreeSelection = { type: "subnet", object: sn };
    const snKey = keyStrOfSelection(snSel);
    indexSel(snSel, parentKey);

    for (const rg of subnetRanges(sn)) {
      const rgSel: TreeSelection = { type: "range", object: rg };
      const rgKey = keyStrOfSelection(rgSel);
      indexSel(rgSel, snKey);

      for (const fa of rangeFixed(rg)) {
        // range-fixed has ip, rangeId, and inherits subnetId via rg.subnetId
        const faWithRange: LightFixedAddressDto & {
          range?: Pick<LightRangeDto, "subnetId">;
        } = {
          ...fa,
          range: { subnetId: rg.subnetId },
        };
        indexSel({ type: "fixedAddress", object: faWithRange }, rgKey);
      }
    }

    for (const fa of subnetFixed(sn)) {
      indexSel({ type: "fixedAddress", object: fa }, snKey);
    }
  };

  for (const ip of (tree.ipSpaces ?? []) as LightIpSpaceDto[]) {
    const ipSel: TreeSelection = { type: "ipSpace", object: ip };
    const ipKey = keyStrOfSelection(ipSel);
    indexSel(ipSel, rootKey);

    // top-level address blocks (recursive)
    for (const ab of ipSpaceAddressBlocks(ip)) {
      walkAddressBlock(ab, ipKey);
    }
    // top-level subnets directly under ipSpace
    for (const sn of ipSpaceSubnets(ip)) {
      walkSubnet(sn, ipKey);
    }
  }

  return {
    parent,
    nodeByKey,
    idToKey,
    rootKey,
    // natural keys
    ipSpaceByName,
    addressBlockByAddress,
    addressBlockByName,
    subnetByAddress,
    subnetByName,
    rangeByTuple,
    fixedByTuple,
  };
}

/* ---------------- path & selection using index (stable keys) ---------------- */
function pathFromIndex(
  parent: Map<KeyStr, KeyStr | null>,
  keyStart: KeyStr | null,
): TreeNodeKey[] {
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

function selectionFromKey(
  nodeByKey: Map<KeyStr, TreeSelection>,
  key: KeyStr | null,
): TreeSelection | null {
  return key ? (nodeByKey.get(key) ?? null) : null;
}

/* ---------------- robust lookup for Jump (Redundancy Panel) ---------------- */
function resolveKeyForJump(
  level: NT,
  objectId: number,
  hint: JumpHint | undefined,
  index: ReturnType<typeof buildIndex>,
): KeyStr | null {
  const {
    idToKey,
    ipSpaceByName,
    addressBlockByAddress,
    addressBlockByName,
    subnetByAddress,
    subnetByName,
    rangeByTuple,
    fixedByTuple,
  } = index;

  // 1) exact id
  const byId = idToKey.get(`${level}:${String(objectId)}`);
  if (byId) return byId;

  // 2) type-specific fallback via hints
  switch (level) {
    case "ipSpace": {
      const fromName = hint?.ipSpaceName ?? hint?.name;
      if (fromName) {
        const k = ipSpaceByName.get(fromName);
        if (k) return k;
      }
      break;
    }
    case "addressBlock": {
      const addr = hint?.address;
      if (addr) {
        const byAddr = addressBlockByAddress.get(addr);
        if (byAddr) return byAddr;
      }
      const nm = hint?.name;
      if (nm) {
        const byName = addressBlockByName.get(nm);
        if (byName) return byName;
      }
      break;
    }
    case "subnet": {
      const addr = hint?.address;
      if (addr) {
        const byAddr = subnetByAddress.get(addr);
        if (byAddr) return byAddr;
      }
      const nm = hint?.name;
      if (nm) {
        const byName = subnetByName.get(nm);
        if (byName) return byName;
      }
      break;
    }
    case "range": {
      const sid = hint?.subnetId;
      const s = hint?.start;
      const e = hint?.end;
      if (sid && s && e) {
        const k = rangeByTuple.get(`${sid}:${s}-${e}`);
        if (k) return k;
      }
      break;
    }
    case "fixedAddress": {
      const sid = hint?.subnetId;
      const ip = hint?.address;
      if (sid && ip) {
        const k = fixedByTuple.get(`${sid}:${ip}`);
        if (k) return k;
      }
      break;
    }
  }

  return null;
}

/* ---------------- search: parser & finder (no any) ---------------- */
function parseQuery(raw: string) {
  const q = raw.trim();
  const lower = q.toLowerCase();

  // Range: "subnetId:start-end" OR "start-end"
  const withSubnet = q.match(
    /^(\d+):(\d{1,3}(?:\.\d{1,3}){3})-(\d{1,3}(?:\.\d{1,3}){3})$/,
  );
  const rangeOnly = q.match(
    /^(\d{1,3}(?:\.\d{1,3}){3})-(\d{1,3}(?:\.\d{1,3}){3})$/,
  );

  // CIDR/IP: "addr" or "addr/cidr"
  const cidrMatch = q.match(
    /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d|[12]\d|3[0-2]))?$/,
  );

  return { q, lower, withSubnet, rangeOnly, cidrMatch };
}

type SearchableNode = {
  name?: string | number;
  address?: string | number;
  start?: string | number;
  end?: string | number;
  ip?: string | number;
};

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function findKeyByQuery(
  q: string,
  index: ReturnType<typeof buildIndex>,
): KeyStr | null {
  const { lower, withSubnet, rangeOnly, cidrMatch } = parseQuery(q);
  const {
    ipSpaceByName,
    addressBlockByAddress,
    addressBlockByName,
    subnetByAddress,
    subnetByName,
    rangeByTuple,
    fixedByTuple,
    nodeByKey,
  } = index;

  // 1) map-based exacts

  // CIDR / IP → prefer subnet/addressBlock maps & FixedAddress
  if (cidrMatch) {
    const addr = cidrMatch[1];
    const cidr = cidrMatch[2];

    if (cidr) {
      const cidrStr = `${addr}/${cidr}`;
      return (
        subnetByAddress.get(cidrStr) ??
        addressBlockByAddress.get(cidrStr) ??
        null
      );
    }

    // pure IP → FixedAddress (if subnetId unknown → heuristic)
    const fixedGuess = [...fixedByTuple.keys()].find((k) =>
      k.endsWith(`:${addr}`),
    );
    if (fixedGuess) return fixedByTuple.get(fixedGuess) ?? null;

    return subnetByAddress.get(addr) ?? addressBlockByAddress.get(addr) ?? null;
  }

  // Range
  if (withSubnet) {
    const [, sid, start, end] = withSubnet;
    return rangeByTuple.get(`${sid}:${start}-${end}`) ?? null;
  }
  if (rangeOnly) {
    const [, start, end] = rangeOnly;
    const any = [...rangeByTuple.keys()].find((k) =>
      k.endsWith(`:${start}-${end}`),
    );
    if (any) return rangeByTuple.get(any) ?? null;
  }

  // IP-Space / AddressBlock / Subnet by exact name
  const ipSpace = ipSpaceByName.get(q) ?? ipSpaceByName.get(q.toUpperCase());
  if (ipSpace) return ipSpace;

  const abByName = addressBlockByName.get(q);
  if (abByName) return abByName;

  const snByName = subnetByName.get(q);
  if (snByName) return snByName;

  // 2) fallback: loose contains-scan across safe props
  const cand = [...nodeByKey.entries()].find(([, sel]) => {
    const obj = (sel.object ?? {}) as Partial<SearchableNode>;
    const name = toStr(obj.name).toLowerCase();
    const addr = toStr(obj.address).toLowerCase();
    const start = toStr(obj.start).toLowerCase();
    const end = toStr(obj.end).toLowerCase();
    const ip = toStr(obj.ip).toLowerCase();

    return (
      (name && name.includes(lower)) ||
      (addr && addr.includes(lower)) ||
      ((start || end) && `${start}-${end}`.includes(lower)) ||
      (ip && ip.includes(lower))
    );
  });

  return cand?.[0] ?? null;
}

/* ---------------- component ---------------- */
export default function OverviewPage() {
  const [tree, setTree] = useState<DhcpLightTreeDto | null>(null);
  const [selected, setSelected] = useState<TreeSelection | null>(null);
  const [tab, setTab] = useState<
    "tree" | "overview" | "groups" | "redundancies"
  >("tree");
  const [loading, setLoading] = useState(true);
  const [autoExpandPath, setAutoExpandPath] = useState<TreeNodeKey[] | null>(
    null,
  );

  // cached search index
  const [index, setIndex] = useState<ReturnType<typeof buildIndex> | null>(
    null,
  );

  useEffect(() => {
    fetchDhcpLightTree()
      .then((data) => {
        if (data?.ipSpaces) {
          setTree(data);
          if (data.ipSpaces.length > 0) setSelected(getDefaultSelection(data));
          setIndex(data ? buildIndex(data) : null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /** Robust: accepts optional hints from redundancy panel */
  const handleJumpToTree = (
    level: RedundancyLevel,
    objectId: number,
    hint?: JumpHint,
  ) => {
    setTab("tree");
    if (!tree) return;

    if (level === "global") {
      setSelected({ type: "global", object: tree });
      setAutoExpandPath(null);
      return;
    }

    const idx = index ?? buildIndex(tree);
    if (!index) setIndex(idx);

    const key = resolveKeyForJump(level as NT, objectId, hint, idx);

    if (!key) {
      console.warn("[Jump] No matching node for", { level, objectId, hint });
      return;
    }

    const sel = selectionFromKey(idx.nodeByKey, key);
    const path = pathFromIndex(idx.parent, key);

    if (sel) setSelected(sel);
    if (path.length) setAutoExpandPath(path);
  };

  const onImportComplete = async () => {
    const updated = await fetchDhcpLightTree();
    setTree(updated);
    if (updated?.ipSpaces?.length) setSelected(getDefaultSelection(updated));
    setIndex(updated ? buildIndex(updated) : null);
  };

  // Search → expand path and select
  const handleSearch = (query: string) => {
    if (!tree || !index || !query) return;
    setTab("tree");
    const key = findKeyByQuery(query, index);
    if (!key) return;
    const sel = selectionFromKey(index.nodeByKey, key);
    const path = pathFromIndex(index.parent, key);
    if (sel) setSelected(sel);
    if (path.length) setAutoExpandPath(path);
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
              tab === "tree"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("tree")}
          >
            DHCP Tree
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "overview"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("overview")}
          >
            Option Overview
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "groups"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
            }`}
            onClick={() => setTab("groups")}
          >
            Group Overview
          </button>
          <button
            className={`m-2 px-6 py-2 rounded-lg font-bold transition ${
              tab === "redundancies"
                ? "bg-[var(--accent)] text-white"
                : "bg-white/10 text-blue-200"
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
              {/* Search bar */}
              <SearchBar
                onSearch={handleSearch}
                className="border-b border-[var(--border)]"
              />

              <LightTreeView
                tree={tree}
                selected={selected}
                onSelect={setSelected}
                autoExpandPath={autoExpandPath}
                onAutoExpandConsumed={() => setAutoExpandPath(null)}
                followSelection={false}
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
