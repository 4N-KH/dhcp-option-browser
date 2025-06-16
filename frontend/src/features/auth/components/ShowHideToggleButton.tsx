// Renders Show/Hide toggle button for input fields
import React from "react";

interface ShowHideToggleButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

const ShowHideToggleButton: React.FC<ShowHideToggleButtonProps> = ({ isVisible, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-[var(--foreground)] px-3 py-[6px] rounded-full bg-[var(--accent-light)]/80 hover:bg-[var(--accent)] hover:text-white transition-all duration-300 ease-in-out shadow-[0_0_6px_rgba(31,95,216,0.4)]"
    >
      {isVisible ? "Hide" : "Show"}
    </button>
  );
};

export default ShowHideToggleButton;
