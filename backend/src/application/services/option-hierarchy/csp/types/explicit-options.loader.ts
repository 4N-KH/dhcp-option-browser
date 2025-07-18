// src/application/services/option-hierarchy/csp/types/explicit-options.loader.ts
import { Injectable } from '@nestjs/common';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DhcpOptionRaw } from './dhcp-option-raw.type';
import { DhcpOptionRawMapper } from '../dhcp-option-raw.mapper';
import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { AddressBlockDhcpOption } from '@/infrastructure/database/csp/address-block-dhcp-option.entity';
import { SubnetDhcpOption } from '@/infrastructure/database/csp/subnet-dhcp-option.entity';
import { RangeDhcpOption } from '@/infrastructure/database/csp/range-dhcp-option.entity';
import { FixedDhcpOption } from '@/infrastructure/database/csp/fixed-dhcp-option.entity';

@Injectable()
export class ExplicitOptionsLoader {
  constructor(
    @InjectRepository(DhcpGlobalConfigOption)
    private readonly globalOptionRepo: Repository<DhcpGlobalConfigOption>,
    @InjectRepository(IpSpaceDhcpOption)
    private readonly ipSpaceOptionRepo: Repository<IpSpaceDhcpOption>,
    @InjectRepository(AddressBlockDhcpOption)
    private readonly addressBlockOptionRepo: Repository<AddressBlockDhcpOption>,
    @InjectRepository(SubnetDhcpOption)
    private readonly subnetOptionRepo: Repository<SubnetDhcpOption>,
    @InjectRepository(RangeDhcpOption)
    private readonly rangeOptionRepo: Repository<RangeDhcpOption>,
    @InjectRepository(FixedDhcpOption)
    private readonly fixedOptionRepo: Repository<FixedDhcpOption>,
    private readonly dhcpOptionRawMapper: DhcpOptionRawMapper,
  ) {}

  async load(level: ObjectType, levelId: number): Promise<DhcpOptionRaw[]> {
    switch (level) {
      case ObjectType.FIXEDADDRESS: {
        const opts = await this.fixedOptionRepo.find({
          where: { fixedAddressId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      case ObjectType.RANGE: {
        const opts = await this.rangeOptionRepo.find({
          where: { rangeId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      case ObjectType.SUBNET: {
        const opts = await this.subnetOptionRepo.find({
          where: { subnetId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      case ObjectType.ADDRESSBLOCK: {
        const opts = await this.addressBlockOptionRepo.find({
          where: { addressBlockId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      case ObjectType.IPSPACE: {
        const opts = await this.ipSpaceOptionRepo.find({
          where: { ipSpaceId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      case ObjectType.GLOBAL: {
        const opts = await this.globalOptionRepo.find({
          where: { globalConfigId: levelId },
          relations: ['optionCode', 'optionCode.optionSpace'],
        });
        return opts.map((o) =>
          this.dhcpOptionRawMapper.map({
            option_code: o.optionCode?.code ?? o.option_code ?? '',
            option_value: o.option_value,
            type: o.optionCode?.type ?? null,
            optionCode: o.optionCode ?? null,
          }),
        );
      }
      default:
        return [];
    }
  }
}
