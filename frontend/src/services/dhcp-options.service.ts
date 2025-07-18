import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";

export async function fetchEffectiveDhcpOptions(
  objectType: string,
  objectId: number
): Promise<EffectiveDhcpOptionSlimDto[]> {
  const res = await fetch(
    `/api/csp/effective-options/${objectType}/${objectId}`
  );
  if (!res.ok) throw new Error("Failed to load DHCP options");
  return res.json();
}
