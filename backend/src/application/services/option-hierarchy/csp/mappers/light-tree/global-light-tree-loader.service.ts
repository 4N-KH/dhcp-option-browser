import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import {
  DhcpGlobalConfig,
  IpSpace,
  AddressBlock,
  Subnet,
  Range,
  FixedAddress,
} from '@/infrastructure/database/csp';

import { mapGlobalLight } from './map-global-light.mapper';
import {
  IpSpaceWithChildren,
  AddressBlockWithChildren,
  SubnetWithChildren,
  RangeWithChildren,
} from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';

/**
 * Loads a lightweight hierarchical tree of DHCP objects (Global → Space → Block → Subnet → Range → Fixed).
 * Redundancy flags are not resolved here (only structure).
 */
@Injectable()
export class GlobalLightTreeLoaderService {
  constructor(
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalRepo: Repository<DhcpGlobalConfig>,
    @InjectRepository(IpSpace)
    private readonly ipRepo: Repository<IpSpace>,
    @InjectRepository(AddressBlock)
    private readonly blockRepo: Repository<AddressBlock>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(FixedAddress)
    private readonly fixedRepo: Repository<FixedAddress>,
  ) {}

  /** Root loader without redundancy flags */
  async getGlobalLightTree() {
    const globalConfig = await this.globalRepo.findOne({ where: {} });
    const spaces = await this.ipRepo.find();

    const enrichedSpaces: IpSpaceWithChildren[] = [];

    for (const space of spaces) {
      // top-level address blocks
      const rootBlocks = await this.blockRepo.find({
        where: { ipSpaceId: space.id, parentId: IsNull() },
      });

      const blocksWithStuff = await Promise.all(
        rootBlocks.map((b) => this.buildBlockTreeWithRedundancy(b)),
      );

      // subnets directly under the space
      const directSubnets = await this.subnetRepo.find({
        where: { spaceId: space.id, addressBlockId: IsNull() },
      });

      const subnetsWithChildren: SubnetWithChildren[] = [];
      for (const sn of directSubnets) {
        subnetsWithChildren.push(await this.buildSubnetWithRedundancy(sn));
      }

      enrichedSpaces.push({
        ...space,
        addressBlocks: blocksWithStuff,
        subnets: subnetsWithChildren,
      });
    }

    return mapGlobalLight(globalConfig, enrichedSpaces);
  }

  /** Recursively builds an AddressBlock branch (without redundancy) */
  private async buildBlockTreeWithRedundancy(
    block: AddressBlock,
  ): Promise<AddressBlockWithChildren> {
    const childBlocks = await this.blockRepo.find({
      where: { parentId: block.id },
    });

    const childTrees = await Promise.all(
      childBlocks.map((b) => this.buildBlockTreeWithRedundancy(b)),
    );

    const subnets = await this.subnetRepo.find({
      where: { addressBlockId: block.id },
    });

    const subnetsWithChildren: SubnetWithChildren[] = [];
    for (const sn of subnets) {
      subnetsWithChildren.push(await this.buildSubnetWithRedundancy(sn));
    }

    return {
      ...block,
      children: childTrees,
      subnets: subnetsWithChildren,
    };
  }

  /** Builds a Subnet node with its Ranges and direct FixedAddresses */
  private async buildSubnetWithRedundancy(
    sn: Subnet,
  ): Promise<SubnetWithChildren> {
    const rangeEntities = await this.rangeRepo.find({
      where: { subnetId: sn.id },
    });

    const rangesWithChildren: RangeWithChildren[] = [];
    for (const r of rangeEntities) {
      rangesWithChildren.push(await this.buildRangeWithRedundancy(r));
    }

    const fixedAddresses = await this.fixedRepo.find({
      where: { subnetId: sn.id, rangeId: IsNull() },
      order: { address: 'ASC' },
    });

    return {
      ...sn,
      ranges: rangesWithChildren,
      fixedAddresses: fixedAddresses,
    };
  }

  /** Builds a Range node with its FixedAddresses */
  private async buildRangeWithRedundancy(r: Range): Promise<RangeWithChildren> {
    const fixedAddresses = await this.fixedRepo.find({
      where: { rangeId: r.id },
      order: { address: 'ASC' },
    });

    return {
      ...r,
      fixedAddresses: fixedAddresses,
    };
  }
}
