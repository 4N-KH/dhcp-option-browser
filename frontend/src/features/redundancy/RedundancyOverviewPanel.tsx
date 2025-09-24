"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRedundancyOverview } from "@/services/redundancy.service";
import {
  RedundancyOverviewItemDto,
  RedundancyLevel,
} from "@/types/dto/redundancy-overview-item.dto";

type Props = {
  onJump?: (level: RedundancyLevel, objectId: number) => void;
};

const Row: React.FC<{
  item: RedundancyOverviewItemDto;
  onJump?: Props["onJump"];
}> = ({ item, onJump }) => {
  const { level, name, address, redundantOption, objectId } = item;

  // Status in Klammern (inheritanceType) entfernt
  const setIn = redundantOption.setIn.map((s) => `${s.from}`).join("; ");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/5 p-4">
      <div className="text-sm opacity-80 mb-1">level: {level}</div>

      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">
          {name ?? "—"}
          {address ? `  •  ${address}` : ""}
        </div>

        {onJump && (
          <button
            className="ml-4 text-sm px-3 py-1 rounded-md bg-[var(--accent)] text-white hover:opacity-90"
            onClick={() => onJump(level, objectId)}
            aria-label="Open in DHCP Tree"
            title="Open in DHCP Tree"
          >
            Open in Tree
          </button>
        )}
      </div>

      <div className="mt-2 text-sm">
        <span className="opacity-80">redundant option:</span> code:{" "}
        {String(redundantOption.code)} • name: {redundantOption.name} • value:{" "}
        {redundantOption.value}
        {redundantOption.type ? <> • type: {redundantOption.type}</> : null}
      </div>

      <div className="mt-1 text-sm">set in: {setIn}</div>
    </div>
  );
};

const RedundancyOverviewPanel: React.FC<Props> = ({ onJump }) => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<
    RedundancyOverviewItemDto[]
  >({
    queryKey: ["redundancy-overview"],
    queryFn: fetchRedundancyOverview,
  });

  if (isLoading)
    return <div className="p-6 text-blue-200">Loading redundancies…</div>;

  if (error)
    return (
      <div className="p-6 text-red-300">
        Failed to load redundancies: {String(error)}{" "}
        <button
          className="ml-3 px-3 py-1 rounded bg-[var(--accent)] text-white"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="h-full flex flex-col p-2">
      <div className="mb-4 mt-2 flex items-center gap-3">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-60"
        >
          {isFetching ? "Refreshing…" : "Refresh Overview"}
        </button>
        <div className="text-sm opacity-70">
          {data?.length
            ? `${data.length} redundancies`
            : "No redundancies found"}
        </div>
      </div>

      <div className="grid gap-3 overflow-auto pr-2">
        {(data ?? []).map((item, idx) => (
          <Row
            key={`${item.level}-${item.objectId}-${idx}`}
            item={item}
            onJump={onJump}
          />
        ))}
      </div>
    </div>
  );
};

export default RedundancyOverviewPanel;
