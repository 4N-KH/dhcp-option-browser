export interface OptionOccurrenceDto {
  objectType: string;
  objectId: number;
  objectLabel: string;
  objectDisplay: string;
  address?: string | null;
  cidr?: string | null;
  ipSpace?: string | null;
  value: string | null;
  setStatus: "explicit" | "inherited" | "overridden";
  type?: string | null;
  source?: string | null;
}
