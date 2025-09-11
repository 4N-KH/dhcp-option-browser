import { DhcpLightTreeDto } from '@/types/dto/dhcp-light-tree.dto';

// --- Resolves API base URL for client vs. server (Docker) ---
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side (e.g., running in Docker container)
    return process.env.API_BASE_URL || "http://dhcp-backend:3001";
  }
  // Client-side (browser environment)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

const API_BASE_URL = getApiBaseUrl();

// Generic fetch helper returning typed JSON
async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { credentials: "include" }); // Include credentials for session-based APIs
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Fetch DHCP Light-Tree (lightweight tree structure for UI display)
export function fetchDhcpLightTree(): Promise<DhcpLightTreeDto> {
  return fetchJson('/api/csp/tree/light');
}
