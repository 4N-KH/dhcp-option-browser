export interface EffectiveDhcpOptionDto {
  code: string;
  name: string | null;
  type: string | null;
  optionSpaceId: number | null;
  value: string;
  sourceLevel: string;
  sourceId: number | null;
  isExplicit: boolean;
  isInherited: boolean;
  overriddenBy?: { level: string; id: number; value: string } | null;
  comment?: string | null;
  array?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
