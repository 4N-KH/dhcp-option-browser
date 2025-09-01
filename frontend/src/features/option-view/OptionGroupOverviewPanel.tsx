'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchOptionGroupOverview,
  fetchOptionGroupOccurrences,
  fetchOptionGroupOptions,
} from '@/services/option-group-overview.service';
import {
  OptionGroupOverviewDto,
  OptionGroupOccurrenceDto,
  OptionInGroupDto,
} from '@/types/dto/option-group-overview.dto';

const LevelOrder: Array<'global' | 'ipSpace' | 'addressBlock' | 'subnet' | 'range' | 'fixedAddress'> = [
  'global', 'ipSpace', 'addressBlock', 'subnet', 'range', 'fixedAddress',
];

const StatPill: React.FC<{ label: string; value: number; title?: string }> = ({ label, value, title }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-[var(--border)] bg-white/5" title={title}>
    <span className="opacity-70">{label}:</span> <strong>{value}</strong>
  </span>
);

const OptionBadge: React.FC<{ o: OptionInGroupDto }> = ({ o }) => (
  <div className="px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-white/5 whitespace-nowrap flex items-center gap-2">
    <span className="opacity-70 mr-1">{o.spaceName ?? 'default'}</span>
    <strong>dhcp{o.code}</strong>
    <span className="opacity-70"> – {o.name}</span>
    {o.value !== null && (
      <code className="ml-2 px-1 rounded border border-[var(--border)] bg-black/10">
        {o.value}
      </code>
    )}
  </div>
);

const GroupOptions: React.FC<{ groupId: number }> = ({ groupId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['group-options', groupId],
    queryFn: () => fetchOptionGroupOptions(groupId),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="text-xs text-blue-200">Loading group options…</div>;
  if (error) return <div className="text-xs text-red-300">Failed to load options.</div>;

  if (!data || data.length === 0) {
    return <div className="text-xs opacity-60">No options defined in this group.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((o) => <OptionBadge key={o.optionCodeId} o={o} />)}
    </div>
  );
};

const GroupRow: React.FC<{
  g: OptionGroupOverviewDto;
  onOpen: (g: OptionGroupOverviewDto) => void;
}> = ({ g, onOpen }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="w-full text-left px-4 py-3 rounded-lg border border-[var(--border)] bg-white/0 hover:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 shrink-0 w-6 h-6 rounded-lg border border-[var(--border)]"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Hide options' : 'Show options'}
        >
          <span className="block text-xs">{expanded ? '–' : '+'}</span>
        </button>

        <button
          className="flex-1 text-left"
          onClick={() => onOpen(g)}
          title="Show occurrences"
        >
          <div className="font-semibold">{g.groupName}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <StatPill label="total" value={g.counts.total} title="effective (explicit+inherited)" />
            <StatPill label="explicit" value={g.counts.explicit} />
            <StatPill label="inherited" value={g.counts.inherited} />
            <StatPill label="overridden" value={g.counts.overridden} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {LevelOrder.map((lvl) => {
              const b = g.byLevel[lvl];
              return (
                <div key={lvl} className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] bg-white/5">
                  <div className="font-medium mb-1">{lvl}</div>
                  <div className="flex flex-wrap gap-2">
                    <StatPill label="total" value={b.total} />
                    <StatPill label="exp" value={b.explicit} />
                    <StatPill label="inh" value={b.inherited} />
                    <StatPill label="ovr" value={b.overridden} />
                  </div>
                </div>
              );
            })}
          </div>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] bg-white/5">
          <div className="text-xs font-semibold mb-2">Options in this group</div>
          <GroupOptions groupId={g.groupId} />
        </div>
      )}
    </div>
  );
};

const OccRow: React.FC<{ o: OptionGroupOccurrenceDto }> = ({ o }) => (
  <div className="text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-white/5">
    <div className="font-medium">{o.objectType} • {o.objectLabel}</div>
    <div className="opacity-70">{o.objectDisplay}</div>
    <div className="opacity-70">{o.ipSpace ?? ''}{o.cidr ? ` • ${o.cidr}` : ''}{o.address ? ` • ${o.address}` : ''}</div>
    <div className="mt-1 text-xs"><span className="opacity-70">status:</span> <strong>{o.setStatus}</strong></div>
  </div>
);

const OptionGroupOverviewPanel: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['group-overview'],
    queryFn: fetchOptionGroupOverview,
  });
  const [open, setOpen] = React.useState<OptionGroupOverviewDto | null>(null);
  const { data: occ, refetch, isFetching } = useQuery({
    queryKey: ['group-occ', open?.groupId],
    queryFn: () => fetchOptionGroupOccurrences(open!.groupId),
    enabled: !!open,
  });

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col overflow-hidden">
        <div className="mb-2 font-semibold">Option Groups</div>
        {isLoading && <div className="text-blue-200">Loading…</div>}
        {error && <div className="text-red-300">Failed: {String(error)}</div>}
        <div className="grid gap-2 overflow-auto pr-2">
          {(data ?? []).map((g) => (
            <GroupRow key={g.groupId} g={g} onOpen={setOpen} />
          ))}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden">
        <div className="mb-2 flex items-center gap-3">
          <div className="font-semibold">Occurrences {open ? `– ${open.groupName}` : ''}</div>
          {open && (
            <button
              className="px-3 py-1 rounded bg-[var(--accent)] text-white disabled:opacity-60"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
        <div className="grid gap-2 overflow-auto pr-2">
          {open && (occ ?? []).map((o, idx) => <OccRow key={idx} o={o} />)}
          {!open && <div className="opacity-60">Select a group on the left…</div>}
        </div>
      </div>
    </div>
  );
};

export default OptionGroupOverviewPanel;
