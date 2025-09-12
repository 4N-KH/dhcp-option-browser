export enum ObjectType {
  GLOBAL = 'global',
  IPSPACE = 'ipSpace',
  ADDRESSBLOCK = 'addressBlock',
  SUBNET = 'subnet',
  RANGE = 'range',
  FIXEDADDRESS = 'fixedAddress',
}

export const VALID_OBJECT_TYPES = Object.values(ObjectType) as ObjectType[];
