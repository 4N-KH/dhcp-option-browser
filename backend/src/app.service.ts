// backend/src/app.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly cspClient: CspDataClient) {}

  async onModuleInit(): Promise<void> {
    try {
      const subnets: CspSubnetDto[] = await this.cspClient.fetchSubnets();
      this.logger.log(`Retrieved ${subnets.length} subnets from CSP`);
      this.logger.debug(JSON.stringify(subnets.slice(0, 3), null, 2));
    } catch (error) {
      this.logger.error('Failed to retrieve subnets from CSP', error);
    }
  }
}
