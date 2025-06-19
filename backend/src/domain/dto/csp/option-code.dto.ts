export interface CspOptionCodeDto {
  id: string;
  code: number;
  name: string;
  type: string;

  option_space?: string;
  comment?: string;

  [key: string]: any;
}
