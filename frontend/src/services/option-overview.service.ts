// Small fetch helpers for the option overview

import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";
import { OptionValueOverviewDto } from "@/types/dto/option-value-overview.dto";
import { OptionOccurrenceDto } from "@/types/dto/option-occurrence.dto";

function getApiBaseUrl(): string {
  // Client vs SSR fallback
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL || "http://localhost:3001";
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}
const API_BASE_URL = getApiBaseUrl();

// Codes for the left list
export async function fetchOptionCodeOverview(): Promise<
  OptionCodeOverviewDto[]
> {
  const res = await fetch(`${API_BASE_URL}/api/option-overview`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch Option Code Overview");
  return res.json();
}

// Values (variants) for one option and protocol
export async function fetchOptionValues(
  code: string,
  name: string,
  protocol: "IPv4" | "IPv6" = "IPv4",
): Promise<OptionValueOverviewDto[]> {
  const url = new URL(
    `${API_BASE_URL}/api/option-overview/${code}/${encodeURIComponent(name)}/values`,
  );
  url.searchParams.set("protocol", protocol);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch Option Values");
  return res.json();
}

// Occurrences (objects) for a selected variant and protocol
export async function fetchOptionValueOccurrences(
  code: string,
  name: string,
  value: string,
  protocol: "IPv4" | "IPv6" = "IPv4",
): Promise<OptionOccurrenceDto[]> {
  const url = new URL(
    `${API_BASE_URL}/api/option-overview/${code}/${encodeURIComponent(
      name,
    )}/values/${encodeURIComponent(value)}/objects`,
  );
  url.searchParams.set("protocol", protocol);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch Option Occurrences");
  return res.json();
}
