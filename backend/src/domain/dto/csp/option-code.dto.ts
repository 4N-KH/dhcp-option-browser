export interface CspOptionCodeDto {
  id: string;
  code: number;
  name: string;
  type: string;

  option_space?: string | null;
  comment?: string | null;

  source?: string | null;
  array?: boolean | null;

  created_at?: string | null;
  updated_at?: string | null;
}
