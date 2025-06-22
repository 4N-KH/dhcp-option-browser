// src/controller/csp-address-block.controller.ts

import { Controller, Get } from '@nestjs/common';
import { CspAddressBlockImportService } from '@/application/services/import/csp/address-block-import.service';
import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';

@Controller('csp/address-blocks')
export class CspAddressBlockController {
  constructor(
    private readonly addressBlockService: CspAddressBlockImportService,
  ) {}

  @Get()
  async getAllAddressBlocks(): Promise<CspAddressBlockDto[]> {
    return this.addressBlockService.importAddressBlocks();
  }
}
