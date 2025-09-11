import { Injectable } from '@nestjs/common';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { AddressBlock } from '@/infrastructure/database/csp/address-block.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';

export interface ContextLevel {
  level: ObjectType;
  levelId: number;
}

type ParentPointer = { type: ObjectType; id: number } | null;

@Injectable()
export class ContextChainBuilder {
  constructor(
    @InjectRepository(FixedAddress)
    private readonly fixedAddressRepo: Repository<FixedAddress>,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(AddressBlock)
    private readonly addressBlockRepo: Repository<AddressBlock>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
  ) {}

  async build(
    objectType: ObjectType,
    objectId: number,
  ): Promise<ContextLevel[]> {
    const chain: ContextLevel[] = [];
    let currentType: ObjectType | null = objectType;
    let currentId: number | null = objectId;
    const visited = new Set<string>();

    const parentGetters: Record<
      ObjectType,
      (id: number) => Promise<ParentPointer>
    > = {
      [ObjectType.FIXEDADDRESS]: async (id) => {
        const fixed = await this.fixedAddressRepo.findOne({ where: { id } });
        if (!fixed) return null;
        if (typeof fixed.rangeId === 'number' && fixed.rangeId !== null)
          return { type: ObjectType.RANGE, id: fixed.rangeId };
        if (typeof fixed.subnetId === 'number' && fixed.subnetId !== null)
          return { type: ObjectType.SUBNET, id: fixed.subnetId };
        return null;
      },
      [ObjectType.RANGE]: async (id) => {
        const range = await this.rangeRepo.findOne({ where: { id } });
        if (!range) return null;
        if (typeof range.subnetId === 'number' && range.subnetId !== null)
          return { type: ObjectType.SUBNET, id: range.subnetId };
        return null;
      },
      [ObjectType.SUBNET]: async (id) => {
        const subnet = await this.subnetRepo.findOne({ where: { id } });
        if (!subnet) return null;
        if (
          typeof subnet.addressBlockId === 'number' &&
          subnet.addressBlockId !== null
        )
          return { type: ObjectType.ADDRESSBLOCK, id: subnet.addressBlockId };
        if (typeof subnet.spaceId === 'number' && subnet.spaceId !== null)
          return { type: ObjectType.IPSPACE, id: subnet.spaceId };
        return null;
      },
      [ObjectType.ADDRESSBLOCK]: async (id) => {
        const ab = await this.addressBlockRepo.findOne({ where: { id } });
        if (!ab) return null;
        if (typeof ab.parentId === 'number' && ab.parentId !== null)
          return { type: ObjectType.ADDRESSBLOCK, id: ab.parentId };
        if (typeof ab.ipSpaceId === 'number' && ab.ipSpaceId !== null)
          return { type: ObjectType.IPSPACE, id: ab.ipSpaceId };
        return null;
      },
      [ObjectType.IPSPACE]: () => Promise.resolve(null),
      [ObjectType.GLOBAL]: () => Promise.resolve(null),
    };

    while (currentType !== null && currentId !== null) {
      const key = `${currentType}-${currentId}`;
      if (visited.has(key)) break;
      visited.add(key);

      chain.push({ level: currentType, levelId: currentId });

      const parentGetter = parentGetters[currentType] as (
        id: number,
      ) => Promise<ParentPointer>;
      if (!parentGetter) break;

      const parent = await parentGetter(currentId);
      if (parent) {
        currentType = parent.type;
        currentId = parent.id;
      } else {
        break;
      }
    }

    if (!chain.some((c) => c.level === ObjectType.GLOBAL)) {
      const globalConfig = await this.globalConfigRepo.findOne({ where: {} });
      if (globalConfig) {
        chain.push({ level: ObjectType.GLOBAL, levelId: globalConfig.id });
      }
    }

    return chain.reverse();
  }
}
