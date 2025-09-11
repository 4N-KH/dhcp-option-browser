import { Injectable, Logger } from '@nestjs/common';
import { AuthProvider } from '@/domain/ports/auth-provider.interface';
import { AuthCredentialDto } from '@/domain/dto/auth-credential.dto';
import { CspAuthClient } from '@/infrastructure/api-clients/csp/auth.client';
import { AuthResult } from '@/domain/dto/auth-result.dto';

// Provides CSP authentication logic
@Injectable()
export class CspAuthProvider implements AuthProvider {
  private readonly logger = new Logger(CspAuthProvider.name);

  constructor(private readonly cspClient: CspAuthClient) {}

  // Handles login flow for CSP mode
  async login(dto: AuthCredentialDto): Promise<AuthResult> {
    this.logger.log('Initiating CSP authentication flow');

    if (!dto.apiKey) {
      this.logger.warn('CSP login failed: API Key missing');
      return { success: false, message: 'API Key is required for CSP login' };
    }

    const result = await this.cspClient.testLogin(dto.apiKey);

    if (result.ok) {
      this.logger.log('CSP login successful');
      return { success: true };
    } else {
      this.logger.warn(
        `CSP login failed: ${result.message || 'Unknown error'} (HTTP ${
          result.status ?? 'n/a'
        })`,
      );
      return {
        success: false,
        message: result.message || 'CSP login failed',
      };
    }
  }
}
