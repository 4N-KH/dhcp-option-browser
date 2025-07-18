import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DhcpGlobalConfigOption } from './global-config-option.entity';

@Injectable()
export class GlobalConfigOptionRepository {
  private repo: Repository<DhcpGlobalConfigOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(DhcpGlobalConfigOption);
  }

  async findByParentId(globalConfigId: number) {
    return this.repo.find({
      where: { globalConfigId },
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
