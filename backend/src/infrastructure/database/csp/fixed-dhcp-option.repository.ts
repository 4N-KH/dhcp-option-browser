import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FixedDhcpOption } from './fixed-dhcp-option.entity';

@Injectable()
export class FixedDhcpOptionRepository {
  private repo: Repository<FixedDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(FixedDhcpOption);
  }

  async findByParentId(fixedAddressId: number) {
    return this.repo.find({
      where: { fixedAddressId },
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
