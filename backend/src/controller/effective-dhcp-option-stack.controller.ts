import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EffectiveDhcpOptionStackService } from '@/application/services/option-hierarchy/csp/effective-dhcp-option-stack.service';
import {
  ObjectType,
  VALID_OBJECT_TYPES,
} from '@/domain/enums/csp/object-type.enum';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';

@ApiTags('DHCP Option Stack')
@Controller('/api/csp/effective-options')
export class EffectiveDhcpOptionStackController {
  constructor(
    private readonly effectiveStackService: EffectiveDhcpOptionStackService,
  ) {}

  @Get(':objectType/:objectId')
  @ApiOperation({
    summary:
      'Liefert alle effektiven DHCP-Optionen und ihre Quelle für ein Objekt.',
  })
  @ApiParam({ name: 'objectType', enum: ObjectType })
  @ApiParam({ name: 'objectId', type: Number })
  @ApiQuery({
    name: 'debug',
    required: false,
    type: Boolean,
    description: 'Debug-Ausgabe aktivieren',
  })
  @ApiResponse({ status: 200, type: [EffectiveDhcpOptionSlimDto] })
  async getEffectiveOptions(
    @Param('objectType') objectType: ObjectType,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Query('debug') debug?: string,
  ): Promise<EffectiveDhcpOptionSlimDto[]> {
    if (!VALID_OBJECT_TYPES.includes(objectType)) {
      throw new BadRequestException(`Invalid objectType: ${objectType}`);
    }
    // debug wird als string übergeben ("true"|"false"|undefined)
    const enableDebugLogging = debug === 'true';
    return this.effectiveStackService.getEffectiveOptionsForObject(
      objectType,
      objectId,
      enableDebugLogging,
    );
  }
}
