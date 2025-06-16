import React from "react";
import { AuthMode } from "@/types/enum/auth-mode.enum";

interface AuthModeTabsProps {
  selectedMode: AuthMode;
  onSelect: (mode: AuthMode) => void;
}

// Renders tab buttons to select authentication mode
const AuthModeTabs: React.FC<AuthModeTabsProps> = ({ selectedMode, onSelect }) => {
  return (
    <div className="flex justify-center space-x-4 text-base font-medium mb-6">
      {[AuthMode.GRID, AuthMode.CSP].map((mode) => {
        const isSelected = selectedMode === mode;
        return (
          // Tab button with active state styling
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className={`px-7 py-4 min-w-[160px] rounded-full uppercase tracking-wider font-semibold cursor-pointer backdrop-blur-[6px] border border-[rgba(255,255,255,0.1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out

              ${
                isSelected
                  ? "bg-[var(--accent)] text-white ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)] scale-105"
                  : "bg-[var(--accent-light)]/50 text-[var(--foreground)]/80 hover:ring-1 hover:ring-[var(--accent)] hover:ring-offset-1 hover:ring-offset-[var(--background)] hover:scale-[1.03] hover:bg-[var(--accent-light)]/70 active:scale-[0.98]"
              }`}
          >
            {mode === AuthMode.GRID ? "Grid Manager" : "Cloud Service Platform (CSP)"}
          </button>
        );
      })}
    </div>
  );
};

export default AuthModeTabs;
