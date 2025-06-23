import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/infrastructure/database/csp/user.entity';
import { CspApiKeyVerifierService } from './csp-api-key-verifier.service';
import { signJwtStrict } from '@/shared/utils/jwt.util';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Structure for successful login responses.
 */
export interface LoginResult {
  success: boolean;
  token: string;
}

@Injectable()
export class CspAuthLoginService {
  private readonly logger = new Logger(CspAuthLoginService.name);

  constructor(
    private readonly verifier: CspApiKeyVerifierService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Authenticates a CSP API key and issues a JWT upon success.
   */
  async login(apiKey: string, region: string): Promise<LoginResult> {
    // 1. Validate input (single responsibility, fail fast)
    if (
      typeof apiKey !== 'string' ||
      !apiKey ||
      typeof region !== 'string' ||
      !region
    ) {
      this.logger.warn('Missing or invalid credentials in login attempt');
      throw new UnauthorizedException('Missing credentials');
    }

    // 2. Delegate API key validation to dedicated service
    await this.validateApiKey(apiKey);

    // 3. Retrieve or provision user entity (never store API keys, only hashes)
    const user = await this.getOrCreateUser(apiKey, region);

    // 4. Issue signed JWT (never include API key in payload)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      this.logger.error('JWT_SECRET environment variable is not set');
      throw new Error('Missing JWT_SECRET');
    }
    const token = signJwtStrict({ id: user.id, region }, secret, {
      expiresIn: '1h',
    });

    this.logger.log(`Issued JWT for CSP user id=${user.id} (region=${region})`);
    return { success: true, token };
  }

  // --- SOLID: private methods for isolated responsibilities ---

  /** Delegates CSP API key verification to the external service. */
  private async validateApiKey(apiKey: string): Promise<void> {
    try {
      await this.verifier.verify(apiKey);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error('CSP API key validation failed', err.stack);
      } else {
        this.logger.error('CSP API key validation failed with unknown error');
      }
      throw new UnauthorizedException('Invalid CSP API key');
    }
  }

  /**
   * Retrieves user for the given region and API key hash, or creates one if absent.
   * Never stores the raw API key, only a cryptographic hash.
   */
  private async getOrCreateUser(
    apiKey: string,
    region: string,
  ): Promise<UserEntity> {
    const loginHash = this.makeLoginHash(region, apiKey);
    let user = await this.userRepo.findOne({ where: { region, loginHash } });
    if (!user) {
      user = this.userRepo.create({
        id: uuidv4(),
        region,
        loginHash,
      });
      await this.userRepo.save(user);
      this.logger.log(`Created new CSP user (region=${region})`);
    }
    return user;
  }

  /** Produces a deterministic cryptographic hash from region and API key. */
  private makeLoginHash(region: string, apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(region + ':' + apiKey)
      .digest('hex');
  }
}
