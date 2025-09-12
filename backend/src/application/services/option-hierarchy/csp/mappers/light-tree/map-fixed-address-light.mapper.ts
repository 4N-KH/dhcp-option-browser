import { FixedAddress } from '@/infrastructure/database/csp';
import { LightFixedAddressDto } from '@/domain/dto/csp/light-tree';

export function mapFixedAddressLight(f: FixedAddress): LightFixedAddressDto {
  return {
    id: f.id,
    externalId: f.externalId,
    name: f.name,
    ip: f.address,
    type: f.match_type,
    mac: f.match_value,
    comment: f.comment ?? null,
    rangeId: f.rangeId ?? null,
    subnetId: f.subnetId ?? null,
  };
}
