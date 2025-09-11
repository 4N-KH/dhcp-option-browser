import { Controller, Get } from '@nestjs/common';
import { RedundancyOverviewService } from '@/application/services/option-hierarchy/csp/redundancy-overview.service';
import { RedundancyOverviewItemDto } from '@/domain/dto/csp/redundancy-overview-item.dto';

@Controller('redundancy')
export class RedundancyOverviewController {
  constructor(private readonly service: RedundancyOverviewService) {}

  // GET /redundancy/overview
  @Get('overview')
  async getOverview(): Promise<RedundancyOverviewItemDto[]> {
    return this.service.getRedundancyOverview();
  }
}
