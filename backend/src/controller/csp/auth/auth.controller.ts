import { Body, Controller, Post } from '@nestjs/common';
import { AuthCredentialDto } from '@/domain/dto/auth-credential.dto';
import { AuthMode } from '@/domain/enums/csp/auth-mode.enum';
import { CspAuthLoginService } from '@/application/services/auth/csp/csp-auth-login.service';
import { GridAuthProvider } from '@/application/providers/grid-auth.provider';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly cspAuth: CspAuthLoginService,
    private readonly gridAuth: GridAuthProvider,
  ) {}

  @Post('login')
  async login(@Body() dto: AuthCredentialDto) {
    if (dto.mode === AuthMode.CSP) {
      const result = await this.cspAuth.login(
        dto.apiKey!,
        dto.remember ?? false,
      );
      return {
        success: result.success,
        token: result.token,
        expiresIn: result.expiresIn,
        hashChanged: result.hashChanged,
      };
    }

    if (dto.mode === AuthMode.GRID) {
      const result = await this.gridAuth.login(dto);
      return {
        success: result.success,
        token: null,
        message: result.message,
      };
    }

    return { success: false, message: 'Invalid auth mode' };
  }
}
