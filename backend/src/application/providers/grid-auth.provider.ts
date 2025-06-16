// Provides Grid authentication logic
import { Injectable } from '@nestjs/common';
import { AuthCredentialDto } from '../../domain/dto/auth-credential.dto';
import { AuthProvider } from '../../domain/ports/auth-provider.interface';
import { NiosClient } from '../../infrastructure/api-clients/nios.client';
import { AuthResult } from '../../domain/dto/auth-result.dto';

@Injectable()
export class GridAuthProvider implements AuthProvider {
  constructor(private readonly niosClient: NiosClient) {}

  // Handles login flow for Grid mode
  async login(dto: AuthCredentialDto): Promise<AuthResult> {
    const result = await this.niosClient.testLogin(dto);

    if (result.ok) {
      return { success: true };
    } else {
      return {
        success: false,
        message: result.message || 'Login failed',
      };
    }
  }
}
