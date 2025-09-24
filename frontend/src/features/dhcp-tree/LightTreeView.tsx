"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection, DhcpObjectType } from "@/types/types";
import { getChildren, getNodeLabel } from "./helpers/tree-node-helpers";
import { getIcon } from "./tree-icons";

/* -------------------------------------------------------------------------- */
/*                               Type Definitions                             */
/* -------------------------------------------------------------------------- */

export type NodeType =
  | "global"
  | "ipSpace"
  | "addressBlock"
  | "subnet"
  | "range"
  | "fixedAddress";

export type NodeKey = { type: NodeType; id: string };

interface LightTreeViewProps {
  tree: DhcpLightTreeDto;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  autoExpandPath?: NodeKey[] | null;
  onAutoExpandConsumed?: () => void;
  followSelection?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const read = (obj: unknown, key: string): unknown =>
  isObject(obj) ? obj[key] : undefined;

const toStr = (v: unknown): string | null => {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
};

function stableIdFor(sel: TreeSelection): string {
  const t = sel.type as NodeType;
  const o = sel.object as unknown;
  const rawId = toStr(read(o, "id"));
  if (rawId) return rawId;

  switch (t) {
    case "ipSpace":
      return toStr(read(o, "name")) ?? "ipSpace:unknown";
    case "addressBlock":
    case "subnet": {
      const addr = toStr(read(o, "address"));
      const cidr = toStr(read(o, "cidr"));
      return addr && cidr
        ? `${addr}/${cidr}`
        : toStr(read(o, "name")) ?? `${t}:unknown`;
    }
    case "range": {
      const sid =
        toStr(read(o, "subnetId")) ??
        toStr(read(read(o, "subnet"), "id")) ??
        "?";
      const start = toStr(read(o, "start")) ?? "start?";
      const end = toStr(read(o, "end")) ?? "end?";
      return `${sid}:${start}-${end}`;
    }
    case "fixedAddress": {
      const sid =
        toStr(read(o, "subnetId")) ??
        toStr(read(read(o, "range"), "subnetId")) ??
        toStr(read(read(o, "subnet"), "id")) ??
        "?";
      const ip = toStr(read(o, "ip")) ?? toStr(read(o, "name")) ?? "ip?";
      return `${sid}:${ip}`;
    }
    default:
      return "root";
  }
}

const selectionToNodeKey = (sel: TreeSelection): NodeKey => ({
  type: sel.type as NodeType,
  id: stableIdFor(sel),
});

const nodeKeyToString = (k: NodeKey): string => `${k.type}:${k.id}`;

const sameSelection = (a: TreeSelection | null, b: TreeSelection | null) =>
  !!a && !!b && a.type === b.type && stableIdFor(a) === stableIdFor(b);

/* -------------------------------------------------------------------------- */
/*                                UI Helpers                                  */
/* -------------------------------------------------------------------------- */

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    aria-hidden
    viewBox="0 0 20 20"
    className="w-4 h-4 transition-transform"
    style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
  >
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
}> = ({
  selection,
  selected,
  onSelect,
  isOpen,
  onToggle,
  isExpandedKey,
  level,
}) => {
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
          {getIcon(selection.type as DhcpObjectType)}
        </div>
        <div className={`min-w-0 flex-1 ${isSelected ? "font-semibold" : ""}`}>
          <span
            className={`block truncate leading-5 ${
              isSelected ? "text-[var(--accent)]" : ""
            }`}
          >
            {getNodeLabel(selection)}
          </span>
        </div>
      </div>

      {isOpen && children.length > 0 && (
        <div className="ml-2 border-l border-[var(--border)] pl-2">
          {children.map((child) => {
            const childKey = selectionToNodeKey(child);
            return (
              <Row
                key={nodeKeyToString(childKey)}
                selection={child}
                selected={selected}
                onSelect={onSelect}
                isOpen={isExpandedKey(childKey)}
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

/* -------------------------------------------------------------------------- */
/*                               Main Component                                */
/* -------------------------------------------------------------------------- */

const LightTreeView: React.FC<LightTreeViewProps> = ({
  tree,
  selected,
  onSelect,
  autoExpandPath,
  onAutoExpandConsumed,
  followSelection = false,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const parentOfRef = useRef(new Map<string, string | null>());
  const pendingKeyRef = useRef<string | null>(null);

  const rootSelection = useMemo(
    () => ({ type: "global" as DhcpObjectType, object: tree }),
    [tree]
  );
  const rootKey: NodeKey = { type: "global", id: "root" };
  const rootKeyStr = nodeKeyToString(rootKey);

  const isExpandedKey = useCallback(
    (k: NodeKey) => expanded.has(nodeKeyToString(k)),
    [expanded]
  );

  const toggle = useCallback((k: NodeKey) => {
    const key = nodeKeyToString(k);
    setExpanded((prev) => {
      const next = new Set(prev);
      // kein Ternary → kein ESLint-Fehler
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  /* Build parent map */
  useEffect(() => {
    const parentOf = new Map<string, string | null>();
    const walk = (sel: TreeSelection, parentKeyStr: string | null) => {
      const keyStr = nodeKeyToString(selectionToNodeKey(sel));
      if (!parentOf.has(keyStr)) parentOf.set(keyStr, parentKeyStr);
      getChildren(sel).forEach((c) => walk(c, keyStr));
    };
    walk(rootSelection, null);
    parentOfRef.current = parentOf;

    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(rootKeyStr);
      return next;
    });
  }, [rootSelection, rootKeyStr]);

  const expandAncestors = useCallback(
    (targetKeyStr: string) => {
      const parentOf = parentOfRef.current;
      const path: string[] = [];
      let cur: string | null | undefined = targetKeyStr;
      let guard = 0;
      while (cur && guard++ < 1000) {
        path.push(cur);
        cur = parentOf.get(cur) ?? null;
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        path.forEach((k) => next.add(k));
        next.add(rootKeyStr);
        return next;
      });
    },
    [rootKeyStr]
  );

  const findRowEl = useCallback(
    (keyStr: string): HTMLElement | null =>
      document.querySelector<HTMLElement>(
        `.tree-row[data-tree-key="${keyStr}"]`
      ) ?? document.getElementById(`tree-node-${keyStr}`),
    []
  );

  const flash = (el: HTMLElement) => {
    el.classList.add("ring-2", "ring-[var(--accent)]");
    setTimeout(() => el.classList.remove("ring-2", "ring-[var(--accent)]"), 650);
  };

  const scrollToKey = useCallback(
    (keyStr: string, highlight = false) => {
      const tryScroll = () => {
        const el = findRowEl(keyStr);
        if (!el) return false;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        if (highlight) flash(el);
        return true;
      };
      if (tryScroll()) return;
      const watcher = new MutationObserver(() => {
        if (tryScroll()) watcher.disconnect();
      });
      watcher.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => watcher.disconnect(), 3000);
    },
    [findRowEl]
  );

  /* Follow selection */
  useEffect(() => {
    if (!selected || !followSelection) return;
    const keyStr = nodeKeyToString(selectionToNodeKey(selected));
    expandAncestors(keyStr);
    requestAnimationFrame(() => scrollToKey(keyStr));
  }, [selected, followSelection, expandAncestors, scrollToKey]);

  /* Auto expand path */
  useEffect(() => {
    if (!autoExpandPath || autoExpandPath.length === 0) return;
    const leaf = autoExpandPath[autoExpandPath.length - 1];
    const leafKeyStr = nodeKeyToString(leaf);
    pendingKeyRef.current = leafKeyStr;

    setExpanded((prev) => {
      const next = new Set(prev);
      autoExpandPath.forEach((k) => next.add(nodeKeyToString(k)));
      next.add(rootKeyStr);
      return next;
    });

    requestAnimationFrame(() => {
      if (pendingKeyRef.current) {
        scrollToKey(pendingKeyRef.current, true);
        pendingKeyRef.current = null;
      }
      onAutoExpandConsumed?.();
    });
  }, [autoExpandPath, onAutoExpandConsumed, rootKeyStr, scrollToKey]);

  const rootOpen = isExpandedKey(rootKey);

  return (
    <div className="relative p-4">
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
