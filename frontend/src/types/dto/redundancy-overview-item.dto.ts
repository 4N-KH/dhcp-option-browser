export type RedundancyLevel =
  | "global"
  | "ipSpace"
  | "addressBlock"
  | "subnet"
  | "range"
  | "fixedAddress";

export interface SourceJson {
  from: string;
  inheritanceType: "explicit" | "inherited" | "overridden";
}

export interface RedundantOptionDto {
  code: string;
  name: string;
  value: string;
  type?: string;
  setIn: SourceJson[];
}

export interface RedundancyOverviewItemDto {
  level: RedundancyLevel;
  objectId: number;
  name: string | null;
  address: string | null;
  redundantOption: RedundantOptionDto;
}
