export type ContextTreeMaps = {
  globalConfigId?: number;
  ipSpacesById?: Map<number, { name?: string }>;
  addressBlocksById?: Map<
    number,
    { name?: string; address?: string; cidr?: number }
  >;
  subnetsById?: Map<number, { name?: string; address?: string; cidr?: number }>;
  rangesById?: Map<number, { name?: string; start?: string; end?: string }>;
  fixedAddressesById?: Map<number, { name?: string; address?: string }>;
};
