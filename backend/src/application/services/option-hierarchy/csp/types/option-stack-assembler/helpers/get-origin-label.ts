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
  if (
    originLevel === 'global' &&
    contextTreeMaps?.globalConfigId === originLevelId
  )
    return 'Global DHCP Configuration';
  if (originLevel === 'ipSpace' && contextTreeMaps?.ipSpacesById) {
    const ipSpace = contextTreeMaps.ipSpacesById.get(originLevelId);
    if (ipSpace?.name && ipSpace.name.trim().length > 0)
      return `ipSpace ${ipSpace.name}`;
    return `ipSpace #${originLevelId}`;
  }
  if (originLevel === 'addressBlock' && contextTreeMaps?.addressBlocksById) {
    const ab = contextTreeMaps.addressBlocksById.get(originLevelId);
    if (ab?.name && ab.name.trim().length > 0) return ab.name;
    if (ab?.address && ab.cidr != null) return `${ab.address}/${ab.cidr}`;
    if (ab?.address) return ab.address;
    return `address block #${originLevelId}`;
  }
  if (originLevel === 'subnet' && contextTreeMaps?.subnetsById) {
    const sn = contextTreeMaps.subnetsById.get(originLevelId);
    if (sn?.name && sn.name.trim().length > 0) return sn.name;
    if (sn?.address && sn.cidr != null) return `${sn.address}/${sn.cidr}`;
    if (sn?.address) return sn.address;
    return `subnet #${originLevelId}`;
  }
  if (originLevel === 'range' && contextTreeMaps?.rangesById) {
    const rg = contextTreeMaps.rangesById.get(originLevelId);
    if (rg?.name && rg.name.trim().length > 0) return rg.name;
    if (rg?.start && rg?.end) return `${rg.start} – ${rg.end}`;
    if (rg?.start) return rg.start;
    return `range #${originLevelId}`;
  }
  if (originLevel === 'fixedAddress' && contextTreeMaps?.fixedAddressesById) {
    const fa = contextTreeMaps.fixedAddressesById.get(originLevelId);
    if (fa?.name && fa.name.trim().length > 0) return fa.name;
    if (fa?.address) return fa.address;
    return `fixed address #${originLevelId}`;
  }
  return `${originLevel} #${originLevelId}`;
}
