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
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
