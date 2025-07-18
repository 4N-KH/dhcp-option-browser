// global-light-tree-loader.service.ts
// Builds a “light” DHCP tree: Global → IP-Space → Blocks/Subnets → Ranges → Fixed-Addresses (also direct in subnet!)

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

  /** Public entry: returns the whole light tree. */
  async getGlobalLightTree() {
    const globalConfig = await this.globalRepo.findOne({ where: {} });
    const spaces = await this.ipRepo.find();

    const enrichedSpaces: IpSpaceWithChildren[] = [];

    for (const space of spaces) {
      // 1) blocks that sit directly in the space
      const rootBlocks = await this.blockRepo.find({
        where: { ipSpaceId: space.id, parentId: IsNull() },
      });

      const blocksWithStuff = await Promise.all(
        rootBlocks.map((b) => this.buildBlockTree(b)),
      );

      // 2) subnets that sit directly in the space (no block)
      const directSubnets = await this.subnetRepo.find({
        where: { spaceId: space.id, addressBlockId: IsNull() },
      });

      // load ranges + fixed addresses per subnet
      const subnetsWithChildren: SubnetWithChildren[] = [];
      for (const sn of directSubnets) {
        const { ranges, directFixed } = await this.loadRangesAndDirectFixed(sn);
        subnetsWithChildren.push({
          ...sn,
          ranges,
          fixedAddresses: directFixed,
        });
      }

      enrichedSpaces.push({
        ...space,
        addressBlocks: blocksWithStuff,
        subnets: subnetsWithChildren,
      });
    }

    return mapGlobalLight(globalConfig, enrichedSpaces);
  }

  /** Recursively builds a Block → (sub-blocks + subnets + ranges + fixed addresses) tree. */
  private async buildBlockTree(
    block: AddressBlock,
  ): Promise<AddressBlockWithChildren> {
    const childBlocks = await this.blockRepo.find({
      where: { parentId: block.id },
    });

    const childTrees = await Promise.all(
      childBlocks.map((b) => this.buildBlockTree(b)),
    );

    const subnets = await this.subnetRepo.find({
      where: { addressBlockId: block.id },
    });

    const subnetsWithChildren: SubnetWithChildren[] = [];
    for (const sn of subnets) {
      const { ranges, directFixed } = await this.loadRangesAndDirectFixed(sn);
      subnetsWithChildren.push({
        ...sn,
        ranges,
        fixedAddresses: directFixed,
      });
    }

    return { ...block, children: childTrees, subnets: subnetsWithChildren };
  }

  /**
   * Loads all ranges (+ their fixed addresses) for a single subnet,
   * and also returns all fixed addresses directly attached to the subnet (without range).
   */
  private async loadRangesAndDirectFixed(subnet: Subnet): Promise<{
    ranges: RangeWithChildren[];
    directFixed: FixedAddress[];
  }> {
    // get all ranges for this subnet
    const ranges = await this.rangeRepo.find({
      where: { subnetId: subnet.id },
    });

    let rangeIds: number[] = [];
    if (ranges.length > 0) {
      rangeIds = ranges.map((r) => r.id);
    }

    // get all fixed addresses that are either assigned to this subnet or in its ranges
    const fixedAddresses = await this.fixedRepo.find({
      where: [
        // direct on subnet (no range)
        { subnetId: subnet.id, rangeId: IsNull() },
        // or within one of the ranges
        ...(rangeIds.length > 0
          ? rangeIds.map((rangeId) => ({ rangeId }))
          : []),
      ],
      order: { address: 'ASC' },
    });

    // split into direct and per-range
    const directFixed: FixedAddress[] = fixedAddresses.filter(
      (fa) => fa.subnetId === subnet.id && fa.rangeId == null,
    );

    const fixedByRange: Record<number, FixedAddress[]> = {};
    for (const fa of fixedAddresses) {
      if (fa.rangeId) {
        (fixedByRange[fa.rangeId] ??= []).push(fa);
      }
    }

    const rangesWithFixed: RangeWithChildren[] = ranges.map((r) => ({
      ...r,
      fixedAddresses: fixedByRange[r.id] ?? [],
    }));

    return {
      ranges: rangesWithFixed,
      directFixed,
    };
  }
}
