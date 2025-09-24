import { Injectable } from '@nestjs/common';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionGroupDhcpOption } from '@/infrastructure/database/csp/option-group-dhcp-option.entity';
import { DhcpOptionRaw } from './dhcp-option-raw.type';
import { OptionGroupMetaFactory } from '../option-group-meta.factory';
import { DhcpGlobalConfigOptionGroup } from '@/infrastructure/database/csp/global-config-option-group.entity';
import { IpSpaceOptionGroup } from '@/infrastructure/database/csp/ip-space-option-group.entity';
import { AddressBlockOptionGroup } from '@/infrastructure/database/csp/address-block-option-group.entity';
import { SubnetOptionGroup } from '@/infrastructure/database/csp/subnet-option-group.entity';
import { RangeOptionGroup } from '@/infrastructure/database/csp/range-option-group.entity';
import { FixedAddressOptionGroup } from '@/infrastructure/database/csp/fixed-address-option-group.entity';
import { DhcpOptionRawMapper } from '../dhcp-option-raw.mapper';

@Injectable()
export class OptionGroupsLoader {
  constructor(
    @InjectRepository(DhcpGlobalConfigOptionGroup)
    private readonly globalConfigOptionGroupRepo: Repository<DhcpGlobalConfigOptionGroup>,
    @InjectRepository(IpSpaceOptionGroup)
    private readonly ipSpaceOptionGroupRepo: Repository<IpSpaceOptionGroup>,
    @InjectRepository(AddressBlockOptionGroup)
    private readonly addressBlockOptionGroupRepo: Repository<AddressBlockOptionGroup>,
    @InjectRepository(SubnetOptionGroup)
    private readonly subnetOptionGroupRepo: Repository<SubnetOptionGroup>,
    @InjectRepository(RangeOptionGroup)
    private readonly rangeOptionGroupRepo: Repository<RangeOptionGroup>,
    @InjectRepository(FixedAddressOptionGroup)
    private readonly fixedAddressOptionGroupRepo: Repository<FixedAddressOptionGroup>,
    @InjectRepository(OptionGroupDhcpOption)
    private readonly optionGroupDhcpOptionRepo: Repository<OptionGroupDhcpOption>,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
    private readonly dhcpOptionRawMapper: DhcpOptionRawMapper,
  ) {}

  async load(
    level: ObjectType,
    levelId: number,
  ): Promise<{ group: OptionGroup; options: DhcpOptionRaw[] }[]> {
    let groupLinks: { optionGroupId: number }[] = [];
    switch (level) {
      case ObjectType.FIXEDADDRESS:
        groupLinks = await this.fixedAddressOptionGroupRepo.find({
          where: { fixedAddressId: levelId },
        });
        break;
      case ObjectType.RANGE:
        groupLinks = await this.rangeOptionGroupRepo.find({
          where: { rangeId: levelId },
        });
        break;
      case ObjectType.SUBNET:
        groupLinks = await this.subnetOptionGroupRepo.find({
          where: { subnetId: levelId },
        });
        break;
      case ObjectType.ADDRESSBLOCK:
        groupLinks = await this.addressBlockOptionGroupRepo.find({
          where: { addressBlockId: levelId },
        });
        break;
      case ObjectType.IPSPACE:
        groupLinks = await this.ipSpaceOptionGroupRepo.find({
          where: { ipSpaceId: levelId },
        });
        break;
      case ObjectType.GLOBAL:
        groupLinks = await this.globalConfigOptionGroupRepo.find({
          where: { globalConfigId: levelId },
        });
        break;
      default:
        groupLinks = [];
    }
    if (!groupLinks.length) return [];

    const allGroupIds = groupLinks.map((gl) => gl.optionGroupId);
    if (!allGroupIds.length) return [];

    const groups = await this.optionGroupDhcpOptionRepo.manager.find(
      OptionGroup,
      {
        where: allGroupIds.map((id) => ({ id })),
        relations: [
          'dhcpOptions',
          'dhcpOptions.optionCode',
          'dhcpOptions.optionCode.optionSpace',
        ],
      },
    );

    return groups.map((group) => ({
      group,
      options: (group.dhcpOptions ?? []).map((ogdo) =>
        this.dhcpOptionRawMapper.map({
          option_code: ogdo.optionCode?.code || '',
          option_value: ogdo.option_value,
          type: ogdo.optionCode?.type ?? null,
          optionCode: ogdo.optionCode ?? null,
        }),
      ),
    }));
  }
}
