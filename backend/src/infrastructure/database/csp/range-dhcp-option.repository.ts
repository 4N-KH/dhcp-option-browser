import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RangeDhcpOption } from './range-dhcp-option.entity';

@Injectable()
export class RangeDhcpOptionRepository {
  private repo: Repository<RangeDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(RangeDhcpOption);
  }

  async findByParentId(rangeId: number) {
    return this.repo.find({
      where: { rangeId },
      relations: ['optionCode', 'optionCode.optionSpace', 'range'],
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
      .find({ relations: ['optionCode', 'optionCode.optionSpace', 'range'] })
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
