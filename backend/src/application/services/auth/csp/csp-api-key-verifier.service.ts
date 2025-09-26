import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CspApiKeyVerifierService {
  private readonly logger = new Logger(CspApiKeyVerifierService.name);

  /**
   * Verifies a CSP API key by performing a lightweight GET against Infoblox CSP.
   * Throws UnauthorizedException if the key is invalid or the API is unreachable.
   */
  async verify(apiKey: string): Promise<void> {
    const baseUrl =
      process.env.CSP_BASE_URL ?? 'https://csp.infoblox.com/api/ddi/v1';
    const url = `${baseUrl}/ipam/ip_space?limit=1`;

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Token ${apiKey}` },
        timeout: 7000,
      });

      if (response.status !== 200) {
        this.logger.warn(`Unexpected HTTP ${response.status} during key check`);
        throw new UnauthorizedException('Invalid CSP API key');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          this.logger.warn('Authentication failed: invalid CSP API key');
          throw new UnauthorizedException('Invalid CSP API key');
        }
        this.logger.error(
          `HTTP error during CSP validation: ${error.response?.statusText ?? error.message}`,
        );
        throw new UnauthorizedException('CSP API validation error');
      }
      this.logger.error(`Network or other error: ${(error as Error).message}`);
      throw new UnauthorizedException('CSP API unreachable');
    }
  }
}
