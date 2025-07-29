// src/domain/dto/option-group-occurrence.dto.ts

export class OptionGroupOccurrenceDto {
  objectType: string;
  objectId: number;
  objectLabel: string;
  setStatus: 'explicit' | 'inherited' | 'overridden';
  inheritedFrom?: {
    objectType: string;
    objectId: number;
    objectLabel: string;
  };
  overriddenBy?: {
    objectType: string;
    objectId: number;
    objectLabel: string;
  };
  options: {
    code: string;
    name?: string;
    value: string | null;
    type?: string | null;
    array?: boolean | null;
  }[];
}
