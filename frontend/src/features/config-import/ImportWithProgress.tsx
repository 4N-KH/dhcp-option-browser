"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  triggerFullCspImport,
  fetchImportStatus,
  ImportJobStatus,
} from "@/services/import.service";

interface ImportWithProgressProps {
  onComplete?: () => void;
  onStart?: () => void;
  autoStart?: boolean;
}

const activeStatuses: ImportJobStatus[] = ["running", "queued"];

const ImportWithProgress: React.FC<ImportWithProgressProps> = ({
  onComplete,
  onStart,
  autoStart = false,
}) => {
  // Tracks whether an import job is currently running (shows progress bar)
  const [status, setStatus] = useState<ImportJobStatus | "idle">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll import status periodically
  const pollStatus = useCallback(async (id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    try {
      const res = await fetchImportStatus(id);
      setStatus(res.status);
      setProgress(res.progress ?? 0);
      if (activeStatuses.includes(res.status)) {
        pollRef.current = setTimeout(() => pollStatus(id), 1200);
      }
      if (res.status === "error") setError(res.error || "Import failed.");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not retrieve import status.");
    }
  }, []);

  // Start import (either on button click or if autoStart is true)
  const startImport = useCallback(async () => {
    setStatus("queued");
    setProgress(0);
    setError(null);
    if (onStart) onStart();
    try {
      const { jobId: newJobId } = await triggerFullCspImport();
      pollStatus(newJobId);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Import could not be started.");
    }
  }, [pollStatus, onStart]);

  // Auto-start import if requested
  useEffect(() => {
    if (autoStart) startImport();
  }, [autoStart, startImport]);

  // Trigger onComplete callback if successful
  useEffect(() => {
    if (status === "success" && onComplete) onComplete();
  }, [status, onComplete]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // UI logic
  const showButton =
    status === "idle" || status === "success" || status === "error" || status === "queued";
  const buttonDisabled = activeStatuses.includes(status as ImportJobStatus);

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-2 min-w-[350px]">
      {/* Show button only if no active import is running */}
      {showButton && (
        <button
          onClick={startImport}
          disabled={buttonDisabled}
          className={`m-3 px-8 py-3 rounded-2xl border-2
            ${buttonDisabled
              ? "border-gray-300 bg-gray-100 text-gray-400"
              : "border-blue-800 bg-white text-blue-900 hover:bg-blue-100 hover:border-blue-900"}
            font-semibold text-xl shadow-md transition-all duration-150`}
        >
          {status === "success"
            ? "Import again"
            : "Import DHCP data"}
        </button>
      )}

      {/* Progress bar while active */}
      {activeStatuses.includes(status as ImportJobStatus) && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full bg-[var(--accent-light)] rounded-full h-5 overflow-hidden border border-[var(--border)] mb-2">
            <div
              className="bg-[var(--accent)] h-5 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-[var(--foreground)]">
            {progress < 100 ? `${progress}% loading…` : "Finalizing…"}
          </span>
        </div>
      )}

      {/* Status messages */}
      {status === "success" && (
        <span className="text-base text-[var(--success)] font-semibold">
          Import complete! Continue to view...
        </span>
      )}
      {status === "error" && (
        <span className="text-base text-[var(--danger)] font-mono">{error}</span>
      )}
    </div>
  );
};

export default ImportWithProgress;
