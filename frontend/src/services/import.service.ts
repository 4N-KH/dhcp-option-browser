import axios from "axios";

// Status Enum zur Wiederverwendung im Frontend
export type ImportJobStatus = "queued" | "running" | "success" | "error" | "cancelled";

export interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  error?: string;
}

// Startet den Full-Import und gibt die JobId zurück
export async function triggerFullCspImport(): Promise<{ jobId: string }> {
  const res = await axios.post<{ jobId: string }>("/api/csp/import/all");
  return res.data;
}

// Fragt den aktuellen Import-Status ab (typsichere Antwort)
export async function fetchImportStatus(jobId: string): Promise<ImportJobState> {
  const res = await axios.get<ImportJobState>(`/api/csp/import/status/${jobId}`);
  return res.data;
}

// Bricht den Import-Job ab (gibt Status-Objekt zurück)
export async function cancelImportJob(jobId: string): Promise<{ status: string }> {
  const res = await axios.post<{ status: string }>(`/api/csp/import/cancel/${jobId}`);
  return res.data;
}
