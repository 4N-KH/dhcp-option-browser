import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { OptionGroupOverviewService } from '@/application/services/option-hierarchy/csp/option-group-overview.service';
import {
  OptionGroupOverviewDto,
  OptionGroupOccurrenceDto,
} from '@/domain/dto/csp/option-group-overview.dto';
import { OptionInGroupDto } from '@/domain/dto/csp/option-group-options.dto';

@Controller('api/option-group-overview')
export class OptionGroupOverviewController {
  constructor(private readonly service: OptionGroupOverviewService) {}

  @Get()
  async getAllGroups(): Promise<OptionGroupOverviewDto[]> {
    return this.service.getOverview();
  }

  @Get(':groupId/objects')
  async getObjectsForGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<OptionGroupOccurrenceDto[]> {
    return this.service.getOccurrences(groupId);
  }

  // NEW: Optionen, die in der Gruppe enthalten sind
  @Get(':groupId/options')
  async getOptionsInGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<OptionInGroupDto[]> {
    return this.service.getGroupOptions(groupId);
  }
}
