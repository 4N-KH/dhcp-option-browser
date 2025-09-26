import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CspCredentialEntity } from '@/infrastructure/database/csp/csp-credential.entity';
import {
  encrypt,
  decrypt,
  EncryptedPayload,
} from '@/shared/parser/credential-encryptor';

@Injectable()
export class CredentialCspService {
  constructor(
    @InjectRepository(CspCredentialEntity)
    private readonly credentialRepo: Repository<CspCredentialEntity>,
  ) {}

  /**
   * Store or update an encrypted API key for a given user.
   * Upserts by userId.
   */
  async saveCredential(
    userId: string,
    apiKey: string,
  ): Promise<CspCredentialEntity> {
    const payload: EncryptedPayload = encrypt(apiKey);

    let entity = await this.credentialRepo.findOne({ where: { userId } });
    if (!entity) {
      entity = this.credentialRepo.create({ userId });
    }

    entity.encryptedApiKey = payload.encrypted;
    entity.iv = payload.iv;
    entity.tag = payload.tag;

    return this.credentialRepo.save(entity);
  }

  /**
   * Retrieve and decrypt the API key by userId.
   * Returns null if no credential is stored.
   */
  async getCredential(userId: string): Promise<string | null> {
    const entity = await this.credentialRepo.findOne({ where: { userId } });
    if (!entity) return null;

    const payload: EncryptedPayload = {
      encrypted: entity.encryptedApiKey,
      iv: entity.iv,
      tag: entity.tag,
    };
    return decrypt(payload);
  }

  /**
   * Delete stored credentials for a given user.
   */
  async deleteCredential(userId: string): Promise<void> {
    await this.credentialRepo.delete({ userId });
  }
}
