import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";

// --- Resolves API base URL for client vs. server (Docker) ---
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side (Docker container or SSR)
    return process.env.API_BASE_URL || "http://dhcp-backend:3001";
  }
  // Client-side (browser environment)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

const API_BASE_URL = getApiBaseUrl();

// Fetch effective DHCP options for a specific object (type + ID)
export async function fetchEffectiveDhcpOptions(
  objectType: string,
  objectId: number
): Promise<EffectiveDhcpOptionSlimDto[]> {
  const url = `${API_BASE_URL}/api/csp/effective-options/${objectType}/${objectId}`;
  const res = await fetch(url, { credentials: "include" }); // Include credentials for session authentication
  if (!res.ok) throw new Error("Failed to load DHCP options");
  return res.json();
}
