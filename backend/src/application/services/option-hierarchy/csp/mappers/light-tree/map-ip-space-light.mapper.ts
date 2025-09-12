import { IpSpaceWithChildren } from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';
import { LightIpSpaceDto } from '@/domain/dto/csp/light-tree';
import { mapAddressBlockLight } from './map-address-block-light.mapper';
import { mapSubnetLight } from './map-subnet-light.mapper';

export function mapIpSpaceLight(s: IpSpaceWithChildren): LightIpSpaceDto {
  return {
    id: s.id,
    externalId: s.externalId,
    name: s.name,
    comment: s.comment ?? null,
    addressBlocks: (s.addressBlocks ?? []).map(mapAddressBlockLight),
    subnets: (s.subnets ?? []).map(mapSubnetLight),
  };
}
