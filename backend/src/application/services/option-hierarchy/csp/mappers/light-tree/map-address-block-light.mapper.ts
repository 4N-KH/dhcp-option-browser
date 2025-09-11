import { AddressBlockWithChildren } from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';
import { LightAddressBlockDto } from '@/domain/dto/csp/light-tree';
import { mapSubnetLight } from './map-subnet-light.mapper';

export function mapAddressBlockLight(
  b: AddressBlockWithChildren,
): LightAddressBlockDto {
  return {
    id: b.id,
    externalId: b.externalId,
    name: b.name,
    address: b.address,
    cidr: b.cidr,
    comment: b.comment ?? null,
    parentId: b.parentId ?? null,
    ipSpaceId: b.ipSpaceId ?? null,
    children: (b.children ?? []).map(mapAddressBlockLight),
    subnets: (b.subnets ?? []).map(mapSubnetLight),
  };
}
