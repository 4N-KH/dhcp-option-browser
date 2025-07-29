import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AddressBlockDhcpOption } from './address-block-dhcp-option.entity';

@Injectable()
export class AddressBlockDhcpOptionRepository {
  private repo: Repository<AddressBlockDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(AddressBlockDhcpOption);
  }

  async findByParentId(addressBlockId: number) {
    return this.repo.find({
      where: { addressBlockId },
      relations: ['optionCode', 'optionCode.optionSpace', 'addressBlock'],
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
        relations: ['optionCode', 'optionCode.optionSpace', 'addressBlock'],
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
