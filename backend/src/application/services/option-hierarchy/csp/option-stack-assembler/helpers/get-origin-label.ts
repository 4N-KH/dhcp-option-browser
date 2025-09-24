export function getOriginLevelLabel(
  originLevel: string | undefined,
  originLevelId: number | undefined,
  contextTreeMaps?: {
    globalConfigId?: number;
    ipSpacesById?: Map<number, { name?: string }>;
    addressBlocksById?: Map<
      number,
      { name?: string; address?: string; cidr?: number }
    >;
    subnetsById?: Map<
      number,
      { name?: string; address?: string; cidr?: number }
    >;
    rangesById?: Map<number, { name?: string; start?: string; end?: string }>;
    fixedAddressesById?: Map<number, { name?: string; address?: string }>;
  },
): string | undefined {
  if (!originLevel || originLevelId == null) return undefined;

  // Global config
  if (
    originLevel === 'global' &&
    contextTreeMaps?.globalConfigId === originLevelId
  ) {
    return 'Global DHCP Configuration';
  }

  // IP space
  if (originLevel === 'ipSpace' && contextTreeMaps?.ipSpacesById) {
    const ip = contextTreeMaps.ipSpacesById.get(originLevelId);
    const base =
      ip?.name && ip.name.trim().length > 0 ? ip.name : `#${originLevelId}`;
    return `ipSpace ${base}`;
  }

  // Address block
  if (originLevel === 'addressBlock' && contextTreeMaps?.addressBlocksById) {
    const ab = contextTreeMaps.addressBlocksById.get(originLevelId);
    const base =
      ab?.name && ab.name.trim().length > 0
        ? ab.name
        : ab?.address
          ? ab.cidr != null
            ? `${ab.address}/${ab.cidr}`
            : ab.address
          : `#${originLevelId}`;
    return `address block ${base}`;
  }

  // Subnet
  if (originLevel === 'subnet' && contextTreeMaps?.subnetsById) {
    const sn = contextTreeMaps.subnetsById.get(originLevelId);
    const base =
      sn?.name && sn.name.trim().length > 0
        ? sn.name
        : sn?.address
          ? sn.cidr != null
            ? `${sn.address}/${sn.cidr}`
            : sn.address
          : `#${originLevelId}`;
    return `subnet ${base}`;
  }

  // Range
  if (originLevel === 'range' && contextTreeMaps?.rangesById) {
    const rg = contextTreeMaps.rangesById.get(originLevelId);
    const name = rg?.name && rg.name.trim().length > 0 ? rg.name : null;
    const startEnd = rg?.start && rg?.end ? `${rg.start}–${rg.end}` : undefined;
    const base = name ?? startEnd ?? `#${originLevelId}`;
    return `range ${base}`;
  }

  // Fixed address
  if (originLevel === 'fixedAddress' && contextTreeMaps?.fixedAddressesById) {
    const fa = contextTreeMaps.fixedAddressesById.get(originLevelId);
    const base =
      fa?.name && fa.name.trim().length > 0
        ? fa.name
        : (fa?.address ?? `#${originLevelId}`);
    return `fixed address ${base}`;
  }

  // Fallback
  return `${originLevel} #${originLevelId}`;
}
