// backend/src/infrastructure/api-clients/csp-data.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiConfigService } from '@/shared/config/api-config.service';
import { fetchAllPaginated } from './http-paginator.util';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

@Injectable()
export class CspDataClient {
  private readonly logger = new Logger(CspDataClient.name);
  private readonly headers: Record<string, string>;

  constructor(
    private readonly http: HttpService,
    private readonly config: ApiConfigService,
  ) {
    this.headers = {
      Authorization: `Token ${this.config.cspApiKey}`,
      Accept: 'application/json',
    };
  }

  async fetchSubnets(): Promise<CspSubnetDto[]> {
    const url = `${this.config.cspBaseUrl}/ipam/subnet`;

    try {
      this.logger.log(`Fetching subnets from CSP: ${url}`);
      const subnets = await fetchAllPaginated<CspSubnetDto>(
        this.http,
        url,
        this.headers,
      );
      this.logger.log(`Fetched ${subnets.length} subnets`);
      return subnets;
    } catch (error) {
      this.logger.error('Failed to fetch subnets from CSP', error);
      throw error;
    }
  }

  // Weitere Methoden: fetchIpSpaces, fetchOptionGroups, etc.
}
