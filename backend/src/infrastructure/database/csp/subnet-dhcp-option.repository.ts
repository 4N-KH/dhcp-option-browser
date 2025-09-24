import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubnetDhcpOption } from './subnet-dhcp-option.entity';

// Repository wrapper for SubnetDhcpOption
@Injectable()
export class SubnetDhcpOptionRepository {
  private repo: Repository<SubnetDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SubnetDhcpOption);
  }

  // Find all DHCP options for a given subnet
  async findByParentId(subnetId: number) {
    return this.repo.find({
      where: { subnetId },
      relations: ['optionCode', 'optionCode.optionSpace', 'subnet'],
    });
  }

  // Find a single DHCP option by primary key
  async findOneById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  // Find options on a subnet by code, name, and optional type/source
  async findByCodeNameTypeSource(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ) {
    const results = await this.repo.find({
      relations: ['optionCode', 'optionCode.optionSpace', 'subnet'],
    });
    return results.filter(
      (opt) =>
        opt.optionCode?.code === code &&
        opt.optionCode?.name === name &&
        (type ? opt.optionCode?.type === type : true) &&
        (source ? opt.optionCode?.source === source : true),
    );
  }
}
