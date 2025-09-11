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
      relations: ['optionCode', 'optionCode.optionSpace', 'ipSpace'],
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
      .find({ relations: ['optionCode', 'optionCode.optionSpace', 'ipSpace'] })
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
