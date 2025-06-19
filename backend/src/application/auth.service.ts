// Provides authentication service and credential persistence
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';

import { AuthCredentialDto } from '../domain/dto/auth-credential.dto';
import { AuthMode } from '../domain/enums/csp/auth-mode.enum';
import { CredentialEntity } from '../infrastructure/database/credential.entity';
import { encrypt, decrypt } from '../shared/parser/credential-encryptor';

import { GridAuthProvider } from './providers/grid-auth.provider';
import { CspAuthProvider } from './providers/csp-auth.provider';
import { AuthResult } from '../domain/dto/auth-result.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly grid: GridAuthProvider,
    private readonly csp: CspAuthProvider,
    @InjectRepository(CredentialEntity)
    private readonly credRepo: Repository<CredentialEntity>,
  ) {}

  // Handles login flow and optionally persists credentials
  async login(dto: AuthCredentialDto): Promise<AuthResult> {
    this.logger.log(`Processing login request for mode: ${String(dto.mode)}`);

    let result: AuthResult;

    switch (dto.mode) {
      case AuthMode.GRID:
        result = await this.grid.login(dto);
        break;

      case AuthMode.CSP:
        result = await this.csp.login(dto);
        break;

      default:
        this.logger.warn(`Unsupported auth mode: ${String(dto.mode)}`);
        result = { success: false, message: 'Unsupported auth mode' };
    }

    if (result.success && dto.remember) {
      this.logger.log(
        `Persisting credentials for mode: ${String(dto.mode)} (encrypted)`,
      );

      const entity: DeepPartial<CredentialEntity> = {
        mode: dto.mode,
        username: dto.username ? encrypt(dto.username) : undefined,
        password: dto.password ? encrypt(dto.password) : undefined,
        apiKey: dto.apiKey ? encrypt(dto.apiKey) : undefined,
        region: dto.region !== undefined ? dto.region : undefined,
        encrypted: true,
        createdAt: new Date(),
      };

      await this.credRepo.save(this.credRepo.create(entity));
      this.logger.log(`Credentials persisted successfully`);
    }

    return result;
  }

  // Loads remembered credentials for a given mode
  async loadRememberedCredential(
    mode: AuthMode,
  ): Promise<Partial<AuthCredentialDto> | null> {
    this.logger.log(`Loading remembered credential for mode: ${String(mode)}`);

    const entity = await this.credRepo.findOne({
      where: { mode },
      order: { createdAt: 'DESC' },
    });

    if (!entity) {
      this.logger.warn(
        `No remembered credential available for mode: ${String(mode)}`,
      );
      return null;
    }

    this.logger.log(`Remembered credential loaded for mode: ${String(mode)}`);

    return {
      mode: entity.mode,
      username: entity.username ? safeDecrypt(entity.username) : undefined,
      password: entity.password ? safeDecrypt(entity.password) : undefined,
      apiKey: entity.apiKey ? safeDecrypt(entity.apiKey) : undefined,
      region: entity.region
        ? (entity.region as AuthCredentialDto['region'])
        : undefined,
      remember: true,
    };
  }
}

// Helper to safely decrypt with fallback
function safeDecrypt(data: string): string | undefined {
  try {
    return decrypt(data);
  } catch (err) {
    console.error('[AuthService] Decryption failed:', (err as Error)?.message);
    return undefined;
  }
}
