import axios from "axios";

export type ImportJobStatus = "queued" | "running" | "success" | "error" | "cancelled";
export interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  error?: string;
}

// --- API Base URL Resolver (Client vs SSR/Docker) ---
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-Side (Docker Container)
    return process.env.API_BASE_URL || "http://dhcp-backend:3001";
  }
  // Client-Side (Browser)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

const API_BASE_URL = getApiBaseUrl();

// Startet den Full-Import und gibt die JobId zurück
export async function triggerFullCspImport(): Promise<{ jobId: string }> {
  const res = await axios.post<{ jobId: string }>(
    `${API_BASE_URL}/api/csp/import/all`,
    {},
    { withCredentials: true }
  );
  return res.data;
}

// Fragt den aktuellen Import-Status ab (typsichere Antwort)
export async function fetchImportStatus(jobId: string): Promise<ImportJobState> {
  const res = await axios.get<ImportJobState>(
    `${API_BASE_URL}/api/csp/import/status/${jobId}`,
    { withCredentials: true }
  );
  return res.data;
}
