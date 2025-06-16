// backend/src/infrastructure/api-clients/csp.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, map, catchError, of } from 'rxjs';

export interface CspAuthTestResult {
  ok: boolean;
  message?: string;
  status?: number;
}

@Injectable()
export class CspClient {
  private readonly logger = new Logger(CspClient.name);
  private readonly endpoint =
    'https://csp.infoblox.com/api/ddi/v1/ipam/ip_space';

  constructor(private readonly http: HttpService) {}

  async testLogin(apiKey: string): Promise<CspAuthTestResult> {
    this.logger.log('Testing CSP login (API Key is not logged)');

    try {
      const result = await firstValueFrom(
        this.http
          .get<unknown>(this.endpoint, {
            headers: { Authorization: `Token ${apiKey}` },
          })
          .pipe(
            timeout(5000),
            map((resp) => this.handleResponse(resp)),
            catchError((err) => of(this.handleError(err))),
          ),
      );

      return result;
    } catch {
      this.logger.error('Fatal observable error during CSP login');
      return { ok: false, message: 'Fatal execution error' };
    }
  }

  private handleResponse(resp: unknown): CspAuthTestResult {
    if (
      typeof resp === 'object' &&
      resp !== null &&
      'status' in resp &&
      typeof (resp as { status: unknown }).status === 'number'
    ) {
      const status = (resp as { status: number }).status;

      if (status === 200) {
        this.logger.log('CSP login successful');
        return { ok: true };
      } else if (status === 401) {
        this.logger.warn('CSP login failed: Unauthorized');
        return { ok: false, status, message: 'Unauthorized' };
      } else {
        this.logger.warn(`CSP login failed: HTTP ${status}`);
        return { ok: false, status, message: `Unexpected status: ${status}` };
      }
    }

    this.logger.error('Invalid response type received from CSP');
    return { ok: false, message: 'Invalid response type' };
  }

  private handleError(error: unknown): CspAuthTestResult {
    const safeError = this.safeErrorMessage(error);
    this.logger.error(`CSP login failed: ${safeError}`);
    return { ok: false, message: safeError };
  }

  private safeErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message;
    }
    return 'Unknown error';
  }
}
