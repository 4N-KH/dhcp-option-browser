// backend/src/controller/subnet.controller.ts
import { Controller, Get, Logger, Query } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';
import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

@Controller('subnets')
export class SubnetController {
  private readonly logger = new Logger(SubnetController.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  @Get()
  async getSubnets(@Query('limit') limit?: string): Promise<CspSubnetDto[]> {
    const all = await this.cspDataClient.fetchSubnets();

    if (limit) {
      const num = Number(limit);
      if (!Number.isInteger(num) || num <= 0) {
        this.logger.warn(`Invalid limit: ${limit}`);
        return all;
      }
      return all.slice(0, num);
    }

    return all;
  }
}
