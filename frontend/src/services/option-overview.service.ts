// src/services/option-overview.service.ts

import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";
import { OptionValueOverviewDto } from "@/types/dto/option-value-overview.dto";
import { OptionOccurrenceDto } from "@/types/dto/option-occurrence.dto";

// 1. Alle Optionen (code, name, type, source)
export async function fetchOptionCodeOverview(): Promise<OptionCodeOverviewDto[]> {
  const res = await fetch("/api/option-overview");
  if (!res.ok) throw new Error("Failed to fetch Option Code Overview");
  return res.json();
}

// 2. Alle Werte zu einer Option
export async function fetchOptionValues(
  code: string,
  name: string,
): Promise<OptionValueOverviewDto[]> {
  const url = new URL(`/api/option-overview/${code}/${name}/values`, window.location.origin);
  const res = await fetch(url.toString().replace(window.location.origin, ""));
  if (!res.ok) throw new Error("Failed to fetch Option Values");
  return res.json();
}

// 3. Alle Objekte mit diesem Wert
export async function fetchOptionValueOccurrences(
  code: string,
  name: string,
  value: string,
  type?: string,
  source?: string
): Promise<OptionOccurrenceDto[]> {
  const url = new URL(`/api/option-overview/${code}/${name}/values/${encodeURIComponent(value)}/objects`, window.location.origin);
  if (type) url.searchParams.append("type", type);
  if (source) url.searchParams.append("source", source);
  const res = await fetch(url.toString().replace(window.location.origin, ""));
  if (!res.ok) throw new Error("Failed to fetch Option Occurrences");
  return res.json();
}
