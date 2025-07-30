import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";
import { OptionValueOverviewDto } from "@/types/dto/option-value-overview.dto";
import { OptionOccurrenceDto } from "@/types/dto/option-occurrence.dto";

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

// 1. Fetch all option codes with metadata (code, name, type, source)
export async function fetchOptionCodeOverview(): Promise<OptionCodeOverviewDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/option-overview`, {
    credentials: "include", // Include cookies/session
  });
  if (!res.ok) throw new Error("Failed to fetch Option Code Overview");
  return res.json();
}

// 2. Fetch all values associated with a specific option
export async function fetchOptionValues(
  code: string,
  name: string,
): Promise<OptionValueOverviewDto[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/option-overview/${code}/${name}/values`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to fetch Option Values");
  return res.json();
}

// 3. Fetch all objects where a specific option value is set
export async function fetchOptionValueOccurrences(
  code: string,
  name: string,
  value: string,
  type?: string,
  source?: string
): Promise<OptionOccurrenceDto[]> {
  const url = new URL(
    `${API_BASE_URL}/api/option-overview/${code}/${name}/values/${encodeURIComponent(value)}/objects`,
    API_BASE_URL
  );
  if (type) url.searchParams.append("type", type);
  if (source) url.searchParams.append("source", source);

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch Option Occurrences");
  return res.json();
}
