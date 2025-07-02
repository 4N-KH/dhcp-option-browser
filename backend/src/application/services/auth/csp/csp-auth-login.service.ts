import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/infrastructure/database/csp/user.entity';
import { CspApiKeyVerifierService } from './csp-api-key-verifier.service';
import { signJwtStrict } from '@/shared/utils/jwt.util';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface LoginResult {
  success: boolean;
  token: string;
  expiresIn: string;
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
   * Token lifetime is determined by the "remember" flag.
   */
  async login(
    apiKey: string,
    region: string,
    remember: boolean = false,
  ): Promise<LoginResult> {
    if (
      typeof apiKey !== 'string' ||
      !apiKey ||
      typeof region !== 'string' ||
      !region
    ) {
      this.logger.warn('Missing or invalid credentials in login attempt');
      throw new UnauthorizedException('Missing credentials');
    }

    await this.validateApiKey(apiKey);

    const user = await this.getOrCreateUser(apiKey, region);

    const expiresIn = remember ? '7d' : '1h';
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      this.logger.error('JWT_SECRET environment variable is not set');
      throw new Error('Missing JWT_SECRET');
    }

    const token = signJwtStrict({ id: user.id, region }, secret, { expiresIn });

    this.logger.log(
      `Issued JWT for CSP user id=${user.id} (region=${region}, remember=${remember}, expiresIn=${expiresIn})`,
    );
    return { success: true, token, expiresIn };
  }

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
      user = await this.userRepo.findOne({ where: { region, loginHash } });
      this.logger.log(`Created new CSP user (region=${region})`);
    }
    return user!;
  }

  private makeLoginHash(region: string, apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(region + ':' + apiKey)
      .digest('hex');
  }
}
