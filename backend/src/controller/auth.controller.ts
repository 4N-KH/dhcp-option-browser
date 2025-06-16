// Handles REST endpoints for authentication
import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthCredentialDto } from '../domain/dto/auth-credential.dto';
import { AuthService } from '../application/auth.service';
import { AuthResult } from '../domain/dto/auth-result.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() dto: AuthCredentialDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }
}
