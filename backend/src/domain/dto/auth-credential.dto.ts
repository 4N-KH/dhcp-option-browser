// DTO for authentication credentials
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { AuthMode } from '../enums/csp/auth-mode.enum';

export class AuthCredentialDto {
  @IsEnum(AuthMode)
  mode: AuthMode;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsBoolean()
  remember: boolean;
}
