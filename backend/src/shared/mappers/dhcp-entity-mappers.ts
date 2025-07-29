// src/shared/mappers/dhcp-entity-mappers.ts

import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { AddressBlock } from '@/infrastructure/database/csp/address-block.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';
import {
  IpSpaceEntity,
  AddressBlockEntity,
  SubnetEntity,
  RangeEntity,
  FixedAddressEntity,
} from '@/shared/types/dhcp-entities';

// Jeweils: alle Felder auf undefined/null prüfen, never null!
export function mapIpSpace(e: IpSpace): IpSpaceEntity {
  return {
    id: e.id,
    name: e.name ?? undefined,
  };
}

export function mapAddressBlock(e: AddressBlock): AddressBlockEntity {
  return {
    id: e.id,
    name: e.name ?? undefined,
    address: e.address ?? undefined,
    cidr: typeof e.cidr === 'number' ? e.cidr : undefined,
  };
}

export function mapSubnet(e: Subnet): SubnetEntity {
  return {
    id: e.id,
    name: e.name ?? undefined,
    address: e.address ?? undefined,
    cidr: typeof e.cidr === 'number' ? e.cidr : undefined,
  };
}

export function mapRange(e: Range): RangeEntity {
  return {
    id: e.id,
    name: e.name ?? undefined,
    start: e.start ?? undefined,
    end: e.end ?? undefined,
  };
}

export function mapFixedAddress(e: FixedAddress): FixedAddressEntity {
  return {
    id: e.id,
    name: e.name ?? undefined,
    address: e.address ?? undefined,
  };
}
