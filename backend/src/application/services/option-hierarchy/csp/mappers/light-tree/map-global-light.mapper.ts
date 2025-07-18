import { DhcpGlobalConfig } from '@/infrastructure/database/csp';
import { IpSpaceWithChildren } from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';
import { LightGlobalDhcpConfigDto } from '@/domain/dto/csp/light-tree';
import { mapIpSpaceLight } from './map-ip-space-light.mapper';

export function mapGlobalLight(
  g: DhcpGlobalConfig | null | undefined,
  ipSpaces: IpSpaceWithChildren[],
): LightGlobalDhcpConfigDto {
  return {
    id: g?.id ?? 0,
    comment: g?.comment ?? null,
    ipSpaces: ipSpaces.map(mapIpSpaceLight),
  };
}
