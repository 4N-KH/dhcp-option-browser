import { ObjectType } from '@/domain/enums/csp/object-type.enum';

interface HierarchyLevel {
  type: ObjectType;
  parentField?: string;
  parentType?: ObjectType;
}

export const DHCP_HIERARCHY: Record<ObjectType, HierarchyLevel[]> = {
  [ObjectType.GLOBAL]: [{ type: ObjectType.GLOBAL }],
  [ObjectType.IPSPACE]: [
    {
      type: ObjectType.IPSPACE,
      parentField: 'globalConfigId',
      parentType: ObjectType.GLOBAL,
    },
    { type: ObjectType.GLOBAL },
  ],
  [ObjectType.ADDRESSBLOCK]: [
    {
      type: ObjectType.ADDRESSBLOCK,
      parentField: 'ipSpaceId',
      parentType: ObjectType.IPSPACE,
    },
    {
      type: ObjectType.IPSPACE,
      parentField: 'globalConfigId',
      parentType: ObjectType.GLOBAL,
    },
    { type: ObjectType.GLOBAL },
  ],
  [ObjectType.SUBNET]: [
    {
      type: ObjectType.SUBNET,
      parentField: 'addressBlockId',
      parentType: ObjectType.ADDRESSBLOCK,
    },
    {
      type: ObjectType.ADDRESSBLOCK,
      parentField: 'ipSpaceId',
      parentType: ObjectType.IPSPACE,
    },
    {
      type: ObjectType.IPSPACE,
      parentField: 'globalConfigId',
      parentType: ObjectType.GLOBAL,
    },
    { type: ObjectType.GLOBAL },
  ],
  [ObjectType.RANGE]: [
    {
      type: ObjectType.RANGE,
      parentField: 'subnetId',
      parentType: ObjectType.SUBNET,
    },
    {
      type: ObjectType.SUBNET,
      parentField: 'addressBlockId',
      parentType: ObjectType.ADDRESSBLOCK,
    },
    {
      type: ObjectType.ADDRESSBLOCK,
      parentField: 'ipSpaceId',
      parentType: ObjectType.IPSPACE,
    },
    {
      type: ObjectType.IPSPACE,
      parentField: 'globalConfigId',
      parentType: ObjectType.GLOBAL,
    },
    { type: ObjectType.GLOBAL },
  ],
  [ObjectType.FIXEDADDRESS]: [
    {
      type: ObjectType.FIXEDADDRESS,
      parentField: 'rangeId',
      parentType: ObjectType.RANGE,
    },
    {
      type: ObjectType.RANGE,
      parentField: 'subnetId',
      parentType: ObjectType.SUBNET,
    },
    {
      type: ObjectType.SUBNET,
      parentField: 'addressBlockId',
      parentType: ObjectType.ADDRESSBLOCK,
    },
    {
      type: ObjectType.ADDRESSBLOCK,
      parentField: 'ipSpaceId',
      parentType: ObjectType.IPSPACE,
    },
    {
      type: ObjectType.IPSPACE,
      parentField: 'globalConfigId',
      parentType: ObjectType.GLOBAL,
    },
    { type: ObjectType.GLOBAL },
  ],
};
