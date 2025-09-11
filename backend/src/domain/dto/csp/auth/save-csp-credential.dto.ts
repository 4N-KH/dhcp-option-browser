import { IsEnum, IsString } from 'class-validator';
import { Region } from '@/domain/enums/csp/region.enum';

export class SaveCspCredentialDto {
  @IsEnum(Region)
  region: Region;

  @IsString()
  apiKey: string;
}
