import { IsString } from 'class-validator';

export class SaveCspCredentialDto {
  @IsString()
  apiKey: string;
}
