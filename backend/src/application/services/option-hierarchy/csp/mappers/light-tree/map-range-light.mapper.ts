import { RangeWithChildren } from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';
import { LightRangeDto } from '@/domain/dto/csp/light-tree';
import { mapFixedAddressLight } from './map-fixed-address-light.mapper';

export function mapRangeLight(r: RangeWithChildren): LightRangeDto {
  return {
    id: r.id,
    externalId: r.externalId,
    name: r.name,
    start: r.start,
    end: r.end,
    comment: r.comment ?? null,
    subnetId: r.subnetId,
    fixedAddresses: (r.fixedAddresses ?? []).map(mapFixedAddressLight),
  };
}
