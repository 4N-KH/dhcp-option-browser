import { DhcpLightTreeDto } from '@/types/dto/dhcp-light-tree.dto';

// Basis-Fetch-Helfer
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Light-Tree
export function fetchDhcpLightTree(): Promise<DhcpLightTreeDto> {
  return fetchJson('/api/csp/tree/light');
}
