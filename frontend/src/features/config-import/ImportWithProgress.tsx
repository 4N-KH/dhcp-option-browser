"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  triggerFullCspImport,
  fetchImportStatus,
  cancelImportJob,
  ImportJobStatus,
} from "@/services/import.service";

export default function ImportWithProgress() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportJobStatus | "idle">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll the import job status
  const pollStatus = useCallback(
    async (id: string) => {
      if (pollRef.current) clearTimeout(pollRef.current);
      try {
        const res = await fetchImportStatus(id);
        setStatus(res.status);
        setProgress(res.progress ?? 0);

        if (res.status === "running" || res.status === "queued") {
          pollRef.current = setTimeout(() => pollStatus(id), 1000);
        }
        if (res.status === "error") {
          setError(res.error || "Import failed.");
        }
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to get status.");
      }
    },
    []
  );

  // Start import
  const startImport = useCallback(async () => {
    setStatus("queued");
    setProgress(0);
    setError(null);
    setIsCancelling(false);
    try {
      const { jobId: newJobId } = await triggerFullCspImport();
      setJobId(newJobId);
      pollStatus(newJobId);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to start import.");
    }
  }, [pollStatus]);

  // Cancel import
  const cancelImport = useCallback(async () => {
    if (!jobId) return;
    setIsCancelling(true);
    try {
      await cancelImportJob(jobId);
      // Poll-Status läuft weiter, Status wird im Backend auf CANCELLED gesetzt
    } catch {
      setIsCancelling(false);
      setError("Failed to cancel import.");
    }
  }, [jobId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (jobId) {
      try {
        await navigator.clipboard.writeText(jobId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        setCopied(false);
      }
    }
  }, [jobId]);

  // UI
  return (
    <div className="flex flex-col items-center gap-8 py-10 min-w-[350px]">
      <button
        onClick={startImport}
        disabled={status === "running" || status === "queued"}
        className={`
          px-8 py-3 rounded-2xl border-2
          ${status === "running" || status === "queued"
            ? "border-gray-300 bg-gray-100 text-gray-400"
            : "border-blue-800 bg-white text-blue-900 hover:bg-blue-100 hover:border-blue-900"}
          font-semibold text-xl shadow-md transition-all duration-150
        `}
      >
        {status === "running" || status === "queued"
          ? "Import in progress..."
          : "Start full CSP import"}
      </button>

      {/* Job ID & copy-to-clipboard (modern UI) */}
      {jobId && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-[var(--foreground)]/80 font-mono">
            Job ID: <span className="font-extrabold tracking-wide text-base">{jobId}</span>
          </span>
          <button
            aria-label="Copy Job ID"
            onClick={handleCopy}
            className={`
              relative ml-1 flex items-center justify-center 
              w-8 h-8 rounded-full transition 
              bg-white/10 hover:bg-[var(--accent-light)] 
              shadow-sm hover:shadow-md
              border border-[var(--border)] group
            `}
            type="button"
            tabIndex={0}
          >
            {copied ? (
              // Animated check (modern green)
              <svg
                className="w-5 h-5 text-[var(--success)] transition-all"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                viewBox="0 0 24 24"
              >
                <path d="M6 12l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              // Modern clipboard icon (outline, bigger, more spacing)
              <svg
                className="w-5 h-5 text-[var(--accent)] group-hover:text-[var(--foreground)] transition-all"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.3}
                viewBox="0 0 24 24"
              >
                <rect x="9" y="2.5" width="6" height="4" rx="1.5" />
                <rect x="5" y="6" width="14" height="15" rx="2" />
              </svg>
            )}
            {/* Tooltip: modern, clean, centered, below the icon */}
            <span className={`
              absolute left-1/2 -translate-x-1/2 top-9 min-w-max px-2 py-1 
              rounded text-xs text-white bg-[var(--accent)] shadow-lg
              opacity-0 group-hover:opacity-100 group-focus:opacity-100
              pointer-events-none transition-all duration-150 z-20
              font-sans tracking-tight
            `}>
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
        </div>
      )}

      {/* Progressbar, Status & Cancel Button */}
      {(status === "running" || status === "queued" || status === "cancelled") && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full bg-[var(--accent-light)] rounded-full h-5 overflow-hidden border border-[var(--border)] mb-2">
            <div
              className={`bg-[var(--accent)] h-5 transition-all duration-700 ${
                status === "cancelled" ? "bg-[var(--danger)]/80" : ""
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-[var(--foreground)]">
            {status === "cancelled"
              ? "Import cancelled."
              : progress < 100
              ? `${progress}% loading...`
              : "Finalising..."}
          </span>
          {/* Cancel Button */}
          {(status === "running" || status === "queued") && (
            <button
              onClick={cancelImport}
              disabled={isCancelling}
              className="mt-3 px-4 py-2 rounded-xl border border-[var(--danger)] text-[var(--danger)] bg-white/90 hover:bg-[var(--danger)] hover:text-white font-semibold text-sm transition-all shadow-sm"
              type="button"
            >
              {isCancelling ? "Cancelling..." : "Cancel Import"}
            </button>
          )}
        </div>
      )}

      {status === "success" && (
        <span className="text-base text-[var(--success)] font-semibold">
          Import completed successfully!
        </span>
      )}

      {status === "error" && (
        <span className="text-base text-[var(--danger)] font-mono">
          {error}
        </span>
      )}
    </div>
  );
}
