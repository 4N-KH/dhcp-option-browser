import { mapRangeLight } from './map-range-light.mapper';
import { mapFixedAddressLight } from './map-fixed-address-light.mapper';
import { Subnet, FixedAddress } from '@/infrastructure/database/csp';
import { LightSubnetDto } from '@/domain/dto/csp/light-tree';

export function mapSubnetLight(
  s: Subnet & { ranges?: unknown[]; fixedAddresses?: FixedAddress[] },
): LightSubnetDto {
  return {
    id: s.id,
    externalId: s.externalId,
    name: s.name,
    address: s.address,
    cidr: s.cidr,
    comment: s.comment ?? null,
    ranges: (s.ranges ?? []).map(mapRangeLight),
    fixedAddresses: (s.fixedAddresses ?? []).map(mapFixedAddressLight),
  };
}
