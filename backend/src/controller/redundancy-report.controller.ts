import { Controller, Get } from '@nestjs/common';
import { RedundancyReportService } from '@/application/services/option-hierarchy/csp/redundancy-report.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Redundancy Report')
@Controller('/api/csp/redundancy-report')
export class RedundancyReportController {
  constructor(private readonly redundancyService: RedundancyReportService) {}

  @Get()
  @ApiOperation({
    summary: 'Liefert einen globalen Bericht aller redundanten DHCP-Optionen.',
  })
  async getRedundancyReport() {
    return this.redundancyService.generateReport();
  }
}
