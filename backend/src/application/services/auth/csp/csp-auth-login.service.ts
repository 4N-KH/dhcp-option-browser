import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '@/infrastructure/database/csp/user.entity';
import { CspApiKeyVerifierService } from './csp-api-key-verifier.service';
import { signJwtStrict } from '@/shared/utils/jwt.util';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result object returned after a successful login attempt.
 */
export interface LoginResult {
  success: boolean; // true if the login process completed without errors
  token: string; // signed JWT for the client
  expiresIn: string; // token lifetime (e.g. "1h" or "7d")
  /** true if a new API key was detected and DHCP tables were truncated */
  hashChanged: boolean;
}

@Injectable()
export class CspAuthLoginService {
  private readonly logger = new Logger(CspAuthLoginService.name);

  constructor(
    private readonly verifier: CspApiKeyVerifierService, // verifies the CSP API key with the remote service
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>, // database repository for user entries
    private readonly dataSource: DataSource, // used to run raw SQL queries (table truncation)
  ) {}

  /**
   * Authenticates a CSP API key, checks for tenant changes by computing a login hash,
   * and issues a signed JWT. If the login hash differs from the stored one,
   * all DHCP tables are truncated and a new user record is created.
   */
  async login(apiKey: string, remember: boolean = false): Promise<LoginResult> {
    if (typeof apiKey !== 'string' || !apiKey) {
      this.logger.warn('Login attempt with missing or invalid API key');
      throw new UnauthorizedException('Missing credentials');
    }

    // Ensure the provided API key is valid by calling the verifier service
    await this.validateApiKey(apiKey);

    // Create a stable hash of the API key to detect tenant changes
    const loginHash = this.makeLoginHash(apiKey);
    const existingUser = await this.userRepo.findOne({ where: { loginHash } });

    let hashChanged = false;

    if (!existingUser) {
      // New API key detected -> reset DHCP-related database tables
      await this.truncateAllDhcpTables();

      // Remove old user entries to ensure a clean state
      await this.userRepo.clear();

      // Store a new user record with the new hash
      const newUser = this.userRepo.create({
        id: uuidv4(),
        loginHash,
      });
      await this.userRepo.save(newUser);

      this.logger.log('API key changed – database reset and new user stored');
      hashChanged = true;
    }

    // Determine token lifetime based on the "remember" flag
    const expiresIn = remember ? '7d' : '1h';
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      this.logger.error('JWT_SECRET environment variable is not set');
      throw new Error('Missing JWT_SECRET');
    }

    // Sign a JWT that includes the login hash for tenant identification
    const token = signJwtStrict({ hash: loginHash }, secret, { expiresIn });

    return { success: true, token, expiresIn, hashChanged };
  }

  /**
   * Verifies the CSP API key against the external verification service.
   * Throws an UnauthorizedException if validation fails.
   */
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
   * Truncates all DHCP-related tables in the database.
   * Called only when a new API key is detected.
   */
  private async truncateAllDhcpTables(): Promise<void> {
    this.logger.log('Resetting DHCP tables for new tenant …');
    await this.dataSource.query(`
      TRUNCATE TABLE
        ip_space,
        address_block,
        subnet,
        range,
        fixed_address,
        dhcp_global_config,
        option_group,
        option_code,
        option_space
      CASCADE;
    `);
  }

  /**
   * Creates a SHA-256 hash of the API key to detect tenant changes.
   */
  private makeLoginHash(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
