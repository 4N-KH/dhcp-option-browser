import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection, DhcpObjectType } from "@/types/types";
import { getChildren, getNodeLabel } from "./helpers/tree-node-helpers";
import { getIcon } from "./tree-icons";

/** Node types used in the tree */
export type NodeType = "global" | "ipSpace" | "addressBlock" | "subnet" | "range" | "fixedAddress";
/** Stable path key */
export type NodeKey = { type: NodeType; id: string };

interface LightTreeViewProps {
  tree: DhcpLightTreeDto;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  /** Optional expand path (root→leaf); last entry is the visual target */
  autoExpandPath?: NodeKey[] | null;
  /** Called after path has been applied once */
  onAutoExpandConsumed?: () => void;
  /** expand/scroll when 'selected' changes (default: false) */
  followSelection?: boolean;
}

/* ---------------- helpers: robust, type-aware keys (no any) ---------------- */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function read(obj: unknown, key: string): unknown {
  return isObject(obj) ? obj[key] : undefined;
}

function toStr(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Build a stable id for any selection; prefers numeric/string id. Matches the LightTree DTO. */
function stableIdFor(sel: TreeSelection): string {
  const t = sel.type as NodeType;
  const o = sel.object as unknown;

  const rawId = toStr(read(o, "id"));
  if (rawId) return rawId;

  switch (t) {
    case "ipSpace": {
      // IpSpace hat 'name'
      return toStr(read(o, "name")) ?? "ipSpace:unknown";
    }
    case "addressBlock": {
      // AddressBlock hat 'address' + 'cidr' und 'name'
      const addr = toStr(read(o, "address"));
      const cidr = toStr(read(o, "cidr"));
      const combo = addr && cidr ? `${addr}/${cidr}` : null;
      return combo ?? toStr(read(o, "name")) ?? "addressBlock:unknown";
    }
    case "subnet": {
      // Subnet hat 'address' + 'cidr' und 'name'
      const addr = toStr(read(o, "address"));
      const cidr = toStr(read(o, "cidr"));
      const combo = addr && cidr ? `${addr}/${cidr}` : null;
      return combo ?? toStr(read(o, "name")) ?? "subnet:unknown";
    }
    case "range": {
      // Range hat 'subnetId', 'start', 'end'
      const sid = toStr(read(o, "subnetId")) ?? toStr(read(read(o, "subnet"), "id")) ?? "?:";
      const start = toStr(read(o, "start")) ?? "start?";
      const end = toStr(read(o, "end")) ?? "end?";
      return `${sid}:${start}-${end}`;
    }
    case "fixedAddress": {
      // Fixed hat 'ip' und 'subnetId' ODER (wenn unter Range) 'range.subnetId'
      const sid =
        toStr(read(o, "subnetId")) ??
        toStr(read(read(o, "range"), "subnetId")) ??
        toStr(read(read(o, "subnet"), "id")) ??
        "?:";
      const ip = toStr(read(o, "ip")) ?? toStr(read(o, "name")) ?? "ip?";
      return `${sid}:${ip}`;
    }
    case "global":
    default:
      return "root";
  }
}

function selectionToNodeKey(sel: TreeSelection): NodeKey {
  return { type: sel.type as NodeType, id: stableIdFor(sel) };
}

function nodeKeyToString(k: NodeKey): string {
  return `${k.type}:${k.id}`;
}

function sameSelection(a: TreeSelection | null, b: TreeSelection | null): boolean {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  return stableIdFor(a) === stableIdFor(b);
}

/* ---------------- ui bits ---------------- */

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg aria-hidden viewBox="0 0 20 20" className="w-4 h-4" style={{ transform: `rotate(${open ? 90 : 0}deg)` }}>
    <path d="M7 5l6 5-6 5" fill="currentColor" />
  </svg>
);

const Row: React.FC<{
  selection: TreeSelection;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  isOpen: boolean;
  onToggle: (key: NodeKey) => void;
  isExpandedKey: (key: NodeKey) => boolean;
  level: number;
}> = ({ selection, selected, onSelect, isOpen, onToggle, isExpandedKey, level }) => {
  const children = useMemo(() => getChildren(selection), [selection]);
  const key = selectionToNodeKey(selection);
  const keyStr = nodeKeyToString(key);
  const isSelected = sameSelection(selection, selected);

  return (
    <div style={{ paddingLeft: level * 14 }} className="group">
      <div
        id={`tree-node-${keyStr}`}
        className="tree-row flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition"
        data-tree-key={keyStr}
        onClick={() => onSelect(selection)}
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(key);
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--accent-light)] focus:outline-none transition"
              aria-label={isOpen ? "Collapse" : "Expand"}
              tabIndex={-1}
            >
              <Chevron open={isOpen} />
            </button>
          ) : (
            <span className="inline-block w-5 h-5" />
          )}
        </div>

        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <span className="inline-block">{getIcon(selection.type as DhcpObjectType)}</span>
        </div>

        <div className={`min-w-0 flex-1 ${isSelected ? "font-semibold" : ""}`}>
          <span className={`block truncate leading-5 ${isSelected ? "text-[var(--accent)]" : ""}`}>
            {getNodeLabel(selection)}
          </span>
        </div>
      </div>

      {isOpen && children.length > 0 && (
        <div className="ml-2 border-l border-[var(--border)] pl-2">
          {children.map((child) => {
            const childKey = selectionToNodeKey(child);
            const childOpen = isExpandedKey(childKey);
            return (
              <Row
                key={nodeKeyToString(childKey)}
                selection={child}
                selected={selected}
                onSelect={onSelect}
                isOpen={childOpen}
                onToggle={onToggle}
                isExpandedKey={isExpandedKey}
                level={level + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---------------- main ---------------- */

const LightTreeView: React.FC<LightTreeViewProps> = ({
  tree,
  selected,
  onSelect,
  autoExpandPath,
  onAutoExpandConsumed,
  followSelection = false,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const parentOfRef = useRef<Map<string, string | null>>(new Map()); // childKeyStr -> parentKeyStr|null
  const pendingKeyRef = useRef<string | null>(null); // target to scroll after path expand

  // root selection/key
  const rootSelection: TreeSelection = useMemo(
    () => ({ type: "global" as DhcpObjectType, object: tree }),
    [tree],
  );
  const rootKey: NodeKey = { type: "global", id: "root" };
  const rootKeyStr = nodeKeyToString(rootKey);

  const isExpandedKey = useCallback(
    (k: NodeKey) => expanded.has(nodeKeyToString(k)),
    [expanded],
  );

  const toggle = useCallback((k: NodeKey) => {
    const key = nodeKeyToString(k);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // build parent map; keep root open
  useEffect(() => {
    const parentOf = new Map<string, string | null>();
    const walk = (sel: TreeSelection, parentKeyStr: string | null) => {
      const keyStr = nodeKeyToString(selectionToNodeKey(sel));
      if (!parentOf.has(keyStr)) parentOf.set(keyStr, parentKeyStr);
      const children = getChildren(sel);
      for (const c of children) walk(c, keyStr);
    };
    walk(rootSelection, null);
    parentOfRef.current = parentOf;

    setExpanded((prev) => {
      if (prev.has(rootKeyStr)) return prev;
      const next = new Set(prev);
      next.add(rootKeyStr);
      return next;
    });
  }, [rootSelection, rootKeyStr]);

  // helper: expand ancestor chain for a key string
  const expandAncestors = useCallback((targetKeyStr: string) => {
    const parentOf = parentOfRef.current;
    if (!parentOf.size) return;

    const path: string[] = [];
    let cur: string | null | undefined = targetKeyStr;
    let guard = 0;
    while (cur && guard++ < 1000) {
      path.push(cur);
      cur = parentOf.get(cur) ?? null;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const k of path) next.add(k);
      next.add(rootKeyStr);
      return next;
    });
  }, [rootKeyStr]);

  // DOM query that works regardless of container
  const findRowEl = useCallback((targetKeyStr: string): HTMLElement | null => {
    const q1 = document.querySelector<HTMLElement>(`.tree-row[data-tree-key="${targetKeyStr}"]`);
    if (q1) return q1;
    const q2 = document.getElementById(`tree-node-${targetKeyStr}`);
    return q2 as HTMLElement | null;
  }, []);

  const flash = (el: HTMLElement) => {
    el.classList.add("ring-2", "ring-[var(--accent)]");
    setTimeout(() => el.classList.remove("ring-2", "ring-[var(--accent)]"), 650);
  };

  const scrollToKey = useCallback(
    (targetKeyStr: string, { highlight = false }: { highlight?: boolean } = {}) => {
      let done = false;

      const tryScroll = () => {
        if (done) return true;
        const el = findRowEl(targetKeyStr);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
          if (highlight) flash(el);
          done = true;
          return true;
        }
        return false;
      };

      if (tryScroll()) return;

      const obs = new MutationObserver(() => { tryScroll(); });
      obs.observe(document.body, { childList: true, subtree: true });

      const raf1 = requestAnimationFrame(() => tryScroll());
      const raf2 = requestAnimationFrame(() => tryScroll());
      const timeout = setTimeout(() => { obs.disconnect(); }, 3000);

      const cleanup = () => {
        obs.disconnect();
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(timeout);
      };

      const watcher = new MutationObserver(() => { if (tryScroll()) cleanup(); });
      watcher.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => watcher.disconnect(), 3200);
    },
    [findRowEl],
  );

  // Selected → expand + scroll (ONLY if followSelection = true)
  useEffect(() => {
    if (!selected) return;
    if (!followSelection) return;
    const targetKeyStr = nodeKeyToString(selectionToNodeKey(selected));
    expandAncestors(targetKeyStr);
    requestAnimationFrame(() => scrollToKey(targetKeyStr, { highlight: false }));
  }, [selected, followSelection, expandAncestors, scrollToKey, expanded.size]);

  // autoExpandPath → expand + scroll to leaf (highlight)
  useEffect(() => {
    if (!autoExpandPath || autoExpandPath.length === 0) return;
    const leaf = autoExpandPath[autoExpandPath.length - 1];
    const leafKeyStr = nodeKeyToString(leaf);
    pendingKeyRef.current = leafKeyStr;

    setExpanded((prev) => {
      const next = new Set(prev);
      for (const k of autoExpandPath) next.add(nodeKeyToString(k));
      next.add(rootKeyStr);
      return next;
    });

    requestAnimationFrame(() => {
      if (pendingKeyRef.current) {
        scrollToKey(pendingKeyRef.current, { highlight: true });
        pendingKeyRef.current = null;
      }
      onAutoExpandConsumed?.();
    });
  }, [autoExpandPath, onAutoExpandConsumed, rootKeyStr, scrollToKey]);

  const rootOpen = isExpandedKey(rootKey);

  return (
    <div className="p-4 tree-container">
      <Row
        selection={rootSelection}
        selected={selected}
        onSelect={onSelect}
        isOpen={rootOpen}
        onToggle={toggle}
        isExpandedKey={isExpandedKey}
        level={0}
      />
    </div>
  );
};

export default LightTreeView;
