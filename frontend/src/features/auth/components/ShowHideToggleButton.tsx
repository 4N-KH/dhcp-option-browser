import React from "react";

interface ShowHideToggleButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

const ShowHideToggleButton: React.FC<ShowHideToggleButtonProps> = ({
  isVisible,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="ml-3 px-3 py-[6px] rounded-full text-xs font-semibold text-[var(--foreground)] bg-[var(--accent-light)]/80 hover:bg-[var(--accent)] hover:text-white transition-all duration-300 ease-in-out shadow-[0_0_6px_rgba(31,95,216,0.4)]"
    tabIndex={-1}
  >
    {isVisible ? "Hide" : "Show"}
  </button>
);

export default ShowHideToggleButton;
