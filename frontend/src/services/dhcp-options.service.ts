import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";

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

// Effektive DHCP-Optionen laden
export async function fetchEffectiveDhcpOptions(
  objectType: string,
  objectId: number
): Promise<EffectiveDhcpOptionSlimDto[]> {
  const url = `${API_BASE_URL}/api/csp/effective-options/${objectType}/${objectId}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load DHCP options");
  return res.json();
}
