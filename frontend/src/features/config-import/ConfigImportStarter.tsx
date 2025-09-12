"use client";

import React, { useState, useCallback } from "react";
import { triggerFullCspImport } from "@/services/import.service";

interface ConfigImportStarterProps {
  onSuccess?: () => void;
  className?: string;
}

export const ConfigImportStarter: React.FC<ConfigImportStarterProps> = ({
  onSuccess,
  className = "",
}) => {
  const [loading, setLoading] = useState(false); // Button state
  const [status, setStatus] = useState<string | null>(null); // Status message

  // Handles import process
  const handleImport = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      await triggerFullCspImport();
      setStatus("Import completed successfully. Loading configuration ...");
      onSuccess?.();
    } catch (error: unknown) {
      let message = "An unknown error occurred during the import.";
      if (error instanceof Error) {
        message = "An error occurred during the import: " + error.message;
      }
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return (
    <div
      className={`flex flex-col items-center justify-center h-full ${className}`}
      data-testid="config-import-starter"
    >
      {/* Import button */}
      <button
        className={`
          px-8 py-3 rounded-xl border-2 
          ${
            loading
              ? "border-gray-300 bg-gray-100 text-gray-400"
              : "border-blue-800 bg-white text-blue-900 hover:bg-blue-100 hover:border-blue-900"
          }
          font-semibold text-xl shadow-md transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-300
        `}
        onClick={handleImport}
        disabled={loading}
        aria-busy={loading}
        aria-label="Load DHCP data"
        data-testid="load-data-button"
      >
        {loading ? "Loading ..." : "Load Data"}
      </button>

      {/* Status message */}
      {status && (
        <span className="mt-4 text-base font-mono text-red-200 bg-red-900/50 px-3 py-1 rounded shadow">
          {status}
        </span>
      )}
    </div>
  );
};
