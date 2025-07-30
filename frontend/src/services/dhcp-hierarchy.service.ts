import { DhcpLightTreeDto } from '@/types/dto/dhcp-light-tree.dto';

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

// Basis-Fetch-Helfer
async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Light-Tree
export function fetchDhcpLightTree(): Promise<DhcpLightTreeDto> {
  return fetchJson('/api/csp/tree/light');
}
