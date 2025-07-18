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
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
