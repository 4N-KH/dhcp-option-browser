// Renders Remember me checkbox
import React from "react";

interface RememberCheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RememberCheckbox: React.FC<RememberCheckboxProps> = ({
  checked,
  onChange,
}) => {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)] cursor-pointer select-none">
      {/* checkbox input */}
      <div className="relative">
        <input
          type="checkbox"
          name="remember"
          checked={checked}
          onChange={onChange}
          className="peer appearance-none w-5 h-5 rounded-full border border-[var(--border)] bg-[var(--accent-light)] transition-all duration-300 checked:bg-[var(--accent)] checked:ring-2 checked:ring-[var(--accent-hover)] checked:ring-offset-2 checked:ring-offset-[var(--background)] focus:outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_6px_rgba(0,0,0,0.05)]"
        />
        {/* Tick icon */}
        <svg
          className="absolute inset-0 w-5 h-5 text-[var(--foreground)] opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M6 10l3 3 6-6" />
        </svg>
      </div>
      Remember me
    </label>
  );
};

export default RememberCheckbox;
