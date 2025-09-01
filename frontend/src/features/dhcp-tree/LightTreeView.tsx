import React, { useEffect, useMemo, useState } from "react";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection, DhcpObjectType } from "@/types/types";
import { getChildren, getNodeLabel } from "./helpers/tree-node-helpers";
import { getIcon } from "./tree-icons";

type NodeType = "global" | "ipSpace" | "addressBlock" | "subnet" | "range" | "fixedAddress";
type NodeKey = { type: NodeType; id: number | string };

interface LightTreeViewProps {
  tree: DhcpLightTreeDto;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  autoExpandPath?: NodeKey[] | null;
  onAutoExpandConsumed?: () => void;
}

/** Guard für Objekte mit { id } */
function hasId(val: unknown): val is { id: number | string } {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in (val as Record<string, unknown>) &&
    (typeof (val as { id: unknown }).id === "number" ||
      typeof (val as { id: unknown }).id === "string")
  );
}

/** Key-Helpers */
function nodeKeyToString(k: NodeKey): string {
  return `${k.type}:${k.id}`;
}
function getSelectionId(sel: TreeSelection): number | string {
  const objUnknown = sel.object as unknown;
  if (hasId(objUnknown)) return objUnknown.id;
  return "root";
}
function selectionToNodeKey(sel: TreeSelection): NodeKey {
  return { type: sel.type as NodeType, id: getSelectionId(sel) };
}
function isSameSelection(a: TreeSelection | null, b: TreeSelection | null): boolean {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  return getSelectionId(a) === getSelectionId(b);
}

/** Fester SVG-Chevron (verhindert Glyph-Jitter) */
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    aria-hidden
    viewBox="0 0 20 20"
    className="w-4 h-4 will-change-transform"
    style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
  >
    <path d="M7 5l6 5-6 5" fill="currentColor" />
  </svg>
);

/* ----------------------------- Tree Node ----------------------------- */

const TreeNodeView: React.FC<{
  selection: TreeSelection;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  level?: number;
  isOpen: boolean;
  onToggle: (key: NodeKey) => void;
  isExpandedKey: (key: NodeKey) => boolean;
}> = ({ selection, selected, onSelect, level = 0, isOpen, onToggle, isExpandedKey }) => {
  const children = useMemo(() => getChildren(selection), [selection]);
  const key = selectionToNodeKey(selection);
  const currentSelected = isSameSelection(selection, selected);

  return (
    <div style={{ paddingLeft: level * 14 }} className="group">
      <div
        className={`tree-row flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer select-none transition
          ${currentSelected ? "bg-[var(--accent)] text-white shadow" : "hover:bg-[var(--accent-light)]/70"}
        `}
        onClick={() => onSelect(selection)}
      >
        {/* Spalte 1: Toggle (fix 20px) */}
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
            // Platzhalter hält die Spalte stabil
            <span className="inline-block w-5 h-5" />
          )}
        </div>

        {/* Spalte 2: Icon (fix 20px) */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <span className="inline-block">{getIcon(selection.type as DhcpObjectType)}</span>
        </div>

        {/* Spalte 3: Label (nimmt Restbreite) */}
        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-5">{getNodeLabel(selection)}</span>
        </div>
      </div>

      {/* Children */}
      {isOpen && children.length > 0 && (
        <div className="ml-2 border-l border-[var(--border)] pl-2">
          {children.map((child) => {
            const childKey = selectionToNodeKey(child);
            const childOpen = isExpandedKey(childKey);
            return (
              <TreeNodeView
                key={nodeKeyToString(childKey)}
                selection={child}
                selected={selected}
                onSelect={onSelect}
                level={level + 1}
                isOpen={childOpen}
                onToggle={onToggle}
                isExpandedKey={isExpandedKey}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ----------------------------- Root View ----------------------------- */

const LightTreeView: React.FC<LightTreeViewProps> = ({
  tree,
  selected,
  onSelect,
  autoExpandPath,
  onAutoExpandConsumed,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const root: TreeSelection = { type: "global", object: tree };
  const rootKeyStr = nodeKeyToString({ type: "global", id: "root" });

  // Root immer offen
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.has(rootKeyStr)) return prev;
      const next = new Set(prev);
      next.add(rootKeyStr);
      return next;
    });
  }, [rootKeyStr]);

  // Auto-Expand-Pfad anwenden
  useEffect(() => {
    if (!autoExpandPath || autoExpandPath.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const k of autoExpandPath) next.add(nodeKeyToString(k));
      return next;
    });
    onAutoExpandConsumed?.();
  }, [autoExpandPath, onAutoExpandConsumed]);

  const isExpandedKey = (k: NodeKey) => expanded.has(nodeKeyToString(k));

  const toggle = (k: NodeKey) => {
    const key = nodeKeyToString(k);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rootOpen = isExpandedKey({ type: "global", id: "root" });

  return (
    <div className="p-4 tree-container">
      <TreeNodeView
        selection={root}
        selected={selected}
        onSelect={onSelect}
        level={0}
        isOpen={rootOpen}
        onToggle={toggle}
        isExpandedKey={isExpandedKey}
      />
    </div>
  );
};

export default LightTreeView;
