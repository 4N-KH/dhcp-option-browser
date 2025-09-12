import { RedundancyOverviewItemDto } from "@/types/dto/redundancy-overview-item.dto";

export async function fetchRedundancyOverview(): Promise<
  RedundancyOverviewItemDto[]
> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/redundancy/overview`,
    {
      method: "GET",
    },
  );
  if (!res.ok)
    throw new Error(`Failed to load redundancy overview (${res.status})`);
  return res.json();
}
