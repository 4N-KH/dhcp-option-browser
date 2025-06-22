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

export function normalizeDhcpOptions<T extends RawDhcpOption>(
  options: T[] | undefined | null,
): NormalizedDhcpOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => ({
    ...opt,
    option_code: opt.option_code ?? '',
    option_value: opt.option_value ?? '',
    type: opt.type ?? '',
    // group bleibt optional/nullable, da DTO das erlaubt
  }));
}
