import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IpSpaceDhcpOption } from './ip-space-dhcp-option.entity';

@Injectable()
export class IpSpaceDhcpOptionRepository {
  private repo: Repository<IpSpaceDhcpOption>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(IpSpaceDhcpOption);
  }

  async findByParentId(ipSpaceId: number) {
    return this.repo.find({
      where: { ipSpaceId },
      relations: ['optionCode', 'optionCode.optionSpace'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }
}
