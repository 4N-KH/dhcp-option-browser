// backend/src/shared/config/api-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly config: ConfigService) {}

  get cspApiKey(): string {
    const key = this.config.get<string>('CSP_API_KEY');
    if (!key) {
      throw new Error('CSP_API_KEY is not defined in .env');
    }
    return key;
  }

  get cspBaseUrl(): string {
    return 'https://csp.infoblox.com/api/ddi/v1';
  }
}
