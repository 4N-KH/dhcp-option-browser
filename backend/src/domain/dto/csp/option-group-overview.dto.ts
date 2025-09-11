export type GroupSetStatus = 'explicit' | 'inherited' | 'overridden';

export interface OptionGroupOverviewDto {
  groupId: number;
  groupName: string;
  counts: {
    total: number; // explicit + inherited (effective)
    explicit: number; // effektive explizite Vorkommen
    inherited: number; // effektive geerbte Vorkommen
    overridden: number; // nicht effektiv (nur als Info)
  };
  byLevel: {
    global: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
    ipSpace: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
    addressBlock: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
    subnet: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
    range: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
    fixedAddress: {
      total: number;
      explicit: number;
      inherited: number;
      overridden: number;
    };
  };
}

export interface OptionGroupOccurrenceDto {
  objectType:
    | 'global'
    | 'ipSpace'
    | 'addressBlock'
    | 'subnet'
    | 'range'
    | 'fixedAddress';
  objectId: number;
  objectLabel: string;
  objectDisplay: string;
  address: string | null;
  cidr: string | null;
  ipSpace: string | null;
  setStatus: GroupSetStatus; // explicit | inherited | overridden
}
