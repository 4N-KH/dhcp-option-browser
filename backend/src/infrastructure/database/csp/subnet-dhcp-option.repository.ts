import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubnetDhcpOption } from './subnet-dhcp-option.entity';

@Injectable()
export class SubnetDhcpOptionRepository {
  private repo: Repository<SubnetDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SubnetDhcpOption);
  }

  async findByParentId(subnetId: number) {
    return this.repo.find({
      where: { subnetId },
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
