import { Controller, Get, Post } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DhcpOption } from '../infrastructure/database/dhcp-option.entity';
import { DhcpManagerService } from '../application/dhcp-manager.service';

@Controller('options')
export class DhcpOptionController {
  constructor(
    private readonly manager: DhcpManagerService,
    @InjectRepository(DhcpOption)
    private readonly repo: Repository<DhcpOption>,
  ) {}

  @Get()
  findAll(): Promise<DhcpOption[]> {
    return this.repo.find();
  }

  @Post('import')
  import(): Promise<void> {
    return this.manager.importOptions();
  }
}
