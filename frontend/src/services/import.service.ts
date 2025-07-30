import axios from "axios";

export type ImportJobStatus = "queued" | "running" | "success" | "error" | "cancelled";
export interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  error?: string;
}

// --- Resolves API base URL for client vs. server (Docker) ---
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side (Docker container or SSR)
    return process.env.API_BASE_URL || "http://dhcp-backend:3001";
  }
  // Client-side (browser)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

const API_BASE_URL = getApiBaseUrl();

// Triggers a full CSP import and returns the job ID
export async function triggerFullCspImport(): Promise<{ jobId: string }> {
  const res = await axios.post<{ jobId: string }>(
    `${API_BASE_URL}/api/csp/import/all`,
    {},
    { withCredentials: true } // Send credentials for session authentication
  );
  return res.data;
}

// Fetches the current status of a running import job
export async function fetchImportStatus(jobId: string): Promise<ImportJobState> {
  const res = await axios.get<ImportJobState>(
    `${API_BASE_URL}/api/csp/import/status/${jobId}`,
    { withCredentials: true } // Include credentials for secured API access
  );
  return res.data;
}
