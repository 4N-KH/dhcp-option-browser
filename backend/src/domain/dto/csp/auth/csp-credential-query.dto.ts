import { IsEnum } from 'class-validator';
import { Region } from '@/domain/enums/csp/region.enum';

export class CspCredentialQueryDto {
  @IsEnum(Region)
  region: Region;
}
