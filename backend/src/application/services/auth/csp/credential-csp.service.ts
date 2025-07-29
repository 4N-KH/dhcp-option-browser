import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CspCredentialEntity } from '@/infrastructure/database/csp/csp-credential.entity';
import {
  encrypt,
  decrypt,
  EncryptedPayload,
} from '@/shared/parser/credential-encryptor';
import { Region } from '@/domain/enums/csp/region.enum';

@Injectable()
export class CredentialCspService {
  constructor(
    @InjectRepository(CspCredentialEntity)
    private readonly credentialRepo: Repository<CspCredentialEntity>,
  ) {}

  // Stores an encrypted API key for a user and region
  async saveCredential(
    userId: string,
    region: Region,
    apiKey: string,
  ): Promise<CspCredentialEntity> {
    const payload: EncryptedPayload = encrypt(apiKey);
    // Create and save entity
    const entity = this.credentialRepo.create({
      userId,
      region,
      encryptedApiKey: payload.encrypted,
      iv: payload.iv,
      tag: payload.tag,
    });
    return this.credentialRepo.save(entity);
  }

  // Retrieves and decrypts the API key for a user and region
  async getCredential(userId: string, region: Region): Promise<string | null> {
    const entity = await this.credentialRepo.findOne({
      where: { userId, region },
    });
    if (!entity) return null;
    const payload: EncryptedPayload = {
      encrypted: entity.encryptedApiKey,
      iv: entity.iv,
      tag: entity.tag,
    };
    return decrypt(payload);
  }

  // Deletes credentials for a user and region
  async deleteCredential(userId: string, region: Region): Promise<void> {
    await this.credentialRepo.delete({ userId, region });
  }
}
