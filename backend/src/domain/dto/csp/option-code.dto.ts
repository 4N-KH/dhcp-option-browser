export interface CspOptionCodeDto {
  id: string;
  code: number;
  name: string;
  type: string;

  option_space?: string | null;
  comment?: string | null;
}
