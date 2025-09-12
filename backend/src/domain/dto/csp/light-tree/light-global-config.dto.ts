import { LightIpSpaceDto } from './light-ip-space.dto';

export interface LightGlobalDhcpConfigDto {
  id: number;
  comment: string | null;
  ipSpaces: LightIpSpaceDto[];
}
