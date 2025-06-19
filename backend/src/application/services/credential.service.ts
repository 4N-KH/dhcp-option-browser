import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CredentialEntity } from '../../infrastructure/database/credential.entity';
import { AuthCredentialDto } from '../../domain/dto/auth-credential.dto';
import { AuthMode } from '../../domain/enums/csp/auth-mode.enum';

import { encrypt, decrypt } from '../../shared/parser/credential-encryptor';

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credRepo: Repository<CredentialEntity>,
  ) {}

  /**
   * Save an encrypted credential in the database.
   */
  async saveEncryptedCredential(dto: AuthCredentialDto): Promise<void> {
    const entity = this.credRepo.create({
      mode: dto.mode,
      username: dto.username ? encrypt(dto.username) : undefined,
      password: dto.password ? encrypt(dto.password) : undefined,
      apiKey: dto.apiKey ? encrypt(dto.apiKey) : undefined,
      region: dto.region !== undefined ? dto.region : undefined,
      encrypted: true,
      createdAt: new Date(),
    });

    await this.credRepo.save(entity);
    this.logger.log(`Encrypted credential saved for mode: ${dto.mode}`);
  }

  /**
   * Load the most recent credential for a given mode, decrypted.
   */
  async loadDecryptedCredential(
    mode: AuthMode,
  ): Promise<Partial<AuthCredentialDto> | null> {
    const entity = await this.credRepo.findOne({
      where: { mode },
      order: { createdAt: 'DESC' },
    });

    if (!entity) {
      this.logger.warn(`No credential found for mode: ${mode}`);
      return null;
    }

    this.logger.log(`Loaded credential for mode: ${mode}`);

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

/**
 * Helper: wrap decrypt with safe error handling.
 */
function safeDecrypt(data: string): string | undefined {
  try {
    return decrypt(data);
  } catch (err) {
    console.error(
      '[CredentialService] Decryption failed:',
      (err as Error)?.message,
    );
    return undefined;
  }
}
