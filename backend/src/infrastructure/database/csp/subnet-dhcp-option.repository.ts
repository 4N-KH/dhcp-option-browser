// src/infrastructure/database/csp/subnet-dhcp-option.repository.ts

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
      relations: ['optionCode', 'optionCode.optionSpace', 'subnet'],
    });
  }

  async findOneById(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }

  /**
   * Explizite Suche nach Option auf Subnetzebene (korrekt nach OptionCode.code/name/type/source!)
   */
  async findByCodeNameTypeSource(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ) {
    // Hole alle mit OptionCode-Relation
    return this.repo
      .find({
        relations: ['optionCode', 'optionCode.optionSpace', 'subnet'],
      })
      .then((results) =>
        results.filter(
          (opt) =>
            opt.optionCode?.code === code && // <- HIER!
            opt.optionCode?.name === name &&
            (type ? opt.optionCode?.type === type : true) &&
            (source ? opt.optionCode?.source === source : true),
        ),
      );
  }
}
