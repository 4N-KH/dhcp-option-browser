// src/features/dhcp-browser/LightTreeView.tsx
import React, { useState } from "react";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection, DhcpObjectType } from "./types";
import { getChildren, getNodeLabel } from "./helpers";
import { getIcon } from "./tree-icons";

interface LightTreeViewProps {
  tree: DhcpLightTreeDto;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
}

function getNodeKey(sel: TreeSelection): string {
  return `${sel.type}-${(sel.object as { id: string | number }).id}`;
}

// Recursively renders each node in the tree
const TreeNodeView: React.FC<{
  selection: TreeSelection;
  selected: TreeSelection | null;
  onSelect: (sel: TreeSelection) => void;
  level?: number;
}> = ({ selection, selected, onSelect, level = 0 }) => {
  const children = getChildren(selection);
  const [open, setOpen] = useState(level < 1);

  // Checks if the current node is selected
  const isSelected =
    !!selected &&
    selection.type === selected.type &&
    (selection.object as { id: number | string }).id ===
      (selected.object as { id: number | string }).id;

  return (
    <div style={{ paddingLeft: level * 15 }} className="group">
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer select-none transition 
          ${isSelected ? "bg-[var(--accent)] text-white shadow" : "hover:bg-[var(--accent-light)]/70"}
        `}
        onClick={() => onSelect(selection)}
      >
        {/* Expand/Collapse toggle */}
        {children.length > 0 && (
          <button
            onClick={e => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--accent-light)] focus:outline-none transition"
            aria-label={open ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            <span className="block transition-transform"
              style={{ transform: `rotate(${open ? 90 : 0}deg)` }}>
              ▶
            </span>
          </button>
        )}
        <span>{getIcon(selection.type as DhcpObjectType)}</span>
        <span className="truncate font-medium">{getNodeLabel(selection)}</span>
      </div>
      {open && children.length > 0 && (
        <div className="ml-2 border-l border-[var(--border)] pl-2">
          {children.map(child => (
            <TreeNodeView
              key={getNodeKey(child)}
              selection={child}
              selected={selected}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LightTreeView: React.FC<LightTreeViewProps> = ({
  tree,
  selected,
  onSelect,
}) => {
  const root: TreeSelection = { type: "global", object: tree };

  return (
    <div className="p-4">
      <TreeNodeView
        selection={root}
        selected={selected}
        onSelect={onSelect}
        level={0}
      />
    </div>
  );
};

export default LightTreeView;
