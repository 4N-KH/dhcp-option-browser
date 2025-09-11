// src/shared/utils/dhcp-object-label.util.ts
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import type {
  IpSpaceEntity,
  AddressBlockEntity,
  SubnetEntity,
  RangeEntity,
  FixedAddressEntity,
} from '@/shared/types/csp-dhcp-entities';
type EntityMaps = {
  ipSpacesById?: Map<number, IpSpaceEntity>;
  addressBlocksById?: Map<number, AddressBlockEntity>;
  subnetsById?: Map<number, SubnetEntity>;
  rangesById?: Map<number, RangeEntity>;
  fixedAddressesById?: Map<number, FixedAddressEntity>;
};

/**
 * Liefert ein sprechendes Label für jedes DHCP-Objekt,
 * abhängig von Typ und ID, mit Rückgriff auf die Entity-Maps.
 */
export function buildObjectLabelSync(
  objectType: ObjectType,
  objectId: number,
  maps: EntityMaps,
): string {
  switch (objectType) {
    case ObjectType.GLOBAL:
      return 'Global DHCP Configuration';

    case ObjectType.IPSPACE: {
      const entity = maps.ipSpacesById?.get(objectId);
      return entity?.name?.trim()
        ? `IP Space: ${entity.name}`
        : `IP Space #${objectId}`;
    }
    case ObjectType.ADDRESSBLOCK: {
      const entity = maps.addressBlocksById?.get(objectId);
      if (entity) {
        if (entity.name?.trim()) return entity.name;
        if (entity.address && entity.cidr !== undefined)
          return `${entity.address}/${entity.cidr}`;
      }
      return `Address Block #${objectId}`;
    }
    case ObjectType.SUBNET: {
      const entity = maps.subnetsById?.get(objectId);
      if (entity) {
        if (entity.name?.trim()) return entity.name;
        if (entity.address && entity.cidr !== undefined)
          return `${entity.address}/${entity.cidr}`;
      }
      return `Subnet #${objectId}`;
    }
    case ObjectType.RANGE: {
      const entity = maps.rangesById?.get(objectId);
      if (entity) {
        if (entity.name?.trim()) return entity.name;
        if (entity.start && entity.end)
          return `${entity.start} – ${entity.end}`;
      }
      return `Range #${objectId}`;
    }
    case ObjectType.FIXEDADDRESS: {
      const entity = maps.fixedAddressesById?.get(objectId);
      if (entity) {
        if (entity.name?.trim()) return entity.name;
        if (entity.address) return entity.address;
      }
      return `Fixed Address #${objectId}`;
    }
    default:
      return `Unknown object type (${String(objectType)}) #${objectId}`;
  }
}
