export interface RawDhcpOption {
  group?: string | null;
  option_code: string | null;
  option_value: string | null;
  type: string | null;
  [key: string]: any;
}

export interface NormalizedDhcpOption {
  group?: string | null;
  option_code: string;
  option_value: string;
  type: string;
  [key: string]: any;
}

// Trim fields and ensure defaults
export function normalizeDhcpOptions<T extends RawDhcpOption>(
  options: T[] | undefined | null,
): NormalizedDhcpOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => ({
    ...opt,
    option_code: (opt.option_code ?? '').trim(),
    option_value: (opt.option_value ?? '').trim(),
    type: (opt.type ?? '').trim(),
    group:
      typeof opt.group === 'string' ? opt.group.trim() : (opt.group ?? null),
  }));
}

// Normalize and deduplicate by code/value/type or group name
export function normalizeAndDedupeDhcpOptions<T extends RawDhcpOption>(
  options: T[] | undefined | null,
): NormalizedDhcpOption[] {
  const normalized = normalizeDhcpOptions(options);
  const seenRegular = new Set<string>();
  const seenGroups = new Set<string>();
  const res: NormalizedDhcpOption[] = [];

  for (const opt of normalized) {
    if (opt.type === 'group') {
      const gkey = (opt.group ?? '').toLowerCase();
      if (!gkey || seenGroups.has(gkey)) continue;
      seenGroups.add(gkey);
      res.push(opt);
      continue;
    }

    const key = [opt.option_code, opt.option_value, opt.type]
      .join('|')
      .toLowerCase();
    if (seenRegular.has(key)) continue;
    seenRegular.add(key);
    res.push(opt);
  }

  return res;
}
