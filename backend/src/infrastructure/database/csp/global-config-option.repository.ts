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
      relations: ['optionCode', 'optionCode.optionSpace', 'globalConfig'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }

  async findByCodeNameTypeSource(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ) {
    return this.repo
      .find({
        relations: ['optionCode', 'optionCode.optionSpace', 'globalConfig'],
      })
      .then((results) =>
        results.filter(
          (opt) =>
            opt.optionCode?.code === code &&
            opt.optionCode?.name === name &&
            (type ? opt.optionCode?.type === type : true) &&
            (source ? opt.optionCode?.source === source : true),
        ),
      );
  }
}
