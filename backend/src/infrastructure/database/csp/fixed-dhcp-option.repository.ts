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
      relations: ['optionCode', 'optionCode.optionSpace', 'fixedAddress'],
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
        relations: ['optionCode', 'optionCode.optionSpace', 'fixedAddress'],
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
