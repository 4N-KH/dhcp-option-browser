import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { OptionOverviewService } from '@/application/services/option-hierarchy/csp/option-overview.service';
import { OptionValuesService } from '@/application/services/option-hierarchy/csp/option-values.service';
import { OptionValueEffectivenessService } from '@/application/services/option-hierarchy/csp/option-value-effectiveness.service';
import { OptionValueExplicitService } from '@/application/services/option-hierarchy/csp/option-value-explicit.service';
import { OptionCodeOverviewDto } from '@/domain/dto/csp/option-code-overview.dto';
import { OptionValueOverviewDto } from '@/domain/dto/csp/option-value-overview.dto';
import { OptionOccurrenceDto } from '@/domain/dto/csp/option-occurrence.dto';

@Controller('api/option-overview')
export class OptionOverviewController {
  constructor(
    private readonly optionOverviewService: OptionOverviewService,
    private readonly optionValuesService: OptionValuesService,
    private readonly optionEffectivenessService: OptionValueEffectivenessService,
    private readonly optionExplicitService: OptionValueExplicitService,
  ) {}

  @Get()
  async getAllOptions(): Promise<OptionCodeOverviewDto[]> {
    return this.optionOverviewService.getAllOptionCodesWithAtLeastOneValue();
  }

  @Get(':code/:name/values')
  async getValuesForOption(
    @Param('code', ParseIntPipe) code: number,
    @Param('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionValueOverviewDto[]> {
    return this.optionValuesService.getAllValuesForOptionKey(
      code,
      name,
      type,
      source,
    );
  }

  @Get(':code/:name/values/:value/objects')
  async getObjectsForOptionValue(
    @Param('code', ParseIntPipe) code: number,
    @Param('name') name: string,
    @Param('value') value: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionEffectivenessService.findObjectsWithEffectiveOptionValueKey(
      code,
      name,
      value,
      type,
      source,
    );
  }

  @Get('global/explicit')
  async getExplicitGlobalOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitGlobalOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('ip-space/explicit')
  async getExplicitIpSpaceOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitIpSpaceOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('address-block/explicit')
  async getExplicitAddressBlockOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitAddressBlockOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('subnet/explicit')
  async getExplicitSubnetOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitSubnetOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('range/explicit')
  async getExplicitRangeOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitRangeOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('fixed-address/explicit')
  async getExplicitFixedAddressOptions(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitFixedAddressOptions(
      code,
      name,
      type,
      source,
    );
  }

  @Get('all-levels/explicit')
  async getExplicitOptionsAllLevels(
    @Query('code', ParseIntPipe) code: number,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
    @Query('value') value?: string,
  ): Promise<OptionOccurrenceDto[]> {
    return this.optionExplicitService.findExplicitOptionsAllLevels(
      code,
      name,
      type,
      source,
      value,
    );
  }
}
