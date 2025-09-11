// src/application/services/option-hierarchy/csp/mappers/light-tree/global-light-tree-loader.service.ts
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

//import { DhcpOptionRedundancy } from '@/infrastructure/database/csp/dhcp-option-redundancy.entity';
import { mapGlobalLight } from './map-global-light.mapper';
import {
  IpSpaceWithChildren,
  AddressBlockWithChildren,
  SubnetWithChildren,
  RangeWithChildren,
  //FixedAddressWithRedundancy,
} from '@/application/services/option-hierarchy/csp/mappers/light-tree/types/csp-light-tree.types';

// Dein Enum oder Typ:
/*type ObjectType =
  | 'global'
  | 'ipSpace'
  | 'addressBlock'
  | 'subnet'
  | 'range'
  | 'fixedAddress';
*/
/**
 * Loader erkennt Redundanz pro Objekt durch Redundanz-View.
 * hasRedundancy wird rekursiv aggregiert bis zum Root.
 * Detaillierte Redundanz (z. B. welche Option, welches Value) wird im StackAssembler pro Panel geladen.
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
    // @InjectRepository(DhcpOptionRedundancy)
    // private readonly redundancyRepo: Repository<DhcpOptionRedundancy>,
  ) {}

  // Holt alle Redundanzinfos für einen Satz IDs eines Typs
  /*
  private async getRedundancyMapForObjectIds(
    objectType: ObjectType,
    ids: number[],
  ): Promise<Map<number, boolean>> {
    if (!ids.length) return new Map();
    const rows = await this.redundancyRepo.find({
      where: {
        objectType,
        objectId: ids.length === 1 ? ids[0] : In(ids),
        redundant: true,
      },
      select: ['objectId'],
    });
    const result = new Map<number, boolean>();
    ids.forEach((id) => result.set(id, false));
    rows.forEach((row) => result.set(row.objectId, true));
    return result;
  }
  */

  /** Root: Liefert den Light-Tree ohne Redundanz-Flags */
  async getGlobalLightTree() {
    const globalConfig = await this.globalRepo.findOne({ where: {} });
    const spaces = await this.ipRepo.find();

    // Optional: Global-Redundanz (wenn global Optionen hat)
    // const globalRedundancy = await this.getRedundancyMapForObjectIds('global', [globalConfig?.id ?? 0]);

    const enrichedSpaces: IpSpaceWithChildren[] = [];

    // const ipSpaceIds = spaces.map((s) => s.id);
    // const ipSpaceRedundancy = await this.getRedundancyMapForObjectIds(
    //   'ipSpace',
    //   ipSpaceIds,
    // );

    for (const space of spaces) {
      // --- AddressBlocks direkt im Space ---
      const rootBlocks = await this.blockRepo.find({
        where: { ipSpaceId: space.id, parentId: IsNull() },
      });
      // const blockIds = rootBlocks.map((b) => b.id);
      // const blockRedundancy = await this.getRedundancyMapForObjectIds(
      //   'addressBlock',
      //   blockIds,
      // );

      const blocksWithStuff = await Promise.all(
        rootBlocks.map((b) =>
          this.buildBlockTreeWithRedundancy(b /*, blockRedundancy*/),
        ),
      );

      // --- Subnets direkt im Space ---
      const directSubnets = await this.subnetRepo.find({
        where: { spaceId: space.id, addressBlockId: IsNull() },
      });
      // const subnetIds = directSubnets.map((sn) => sn.id);
      // const subnetRedundancy = await this.getRedundancyMapForObjectIds(
      //   'subnet',
      //   subnetIds,
      // );

      const subnetsWithChildren: SubnetWithChildren[] = [];
      for (const sn of directSubnets) {
        subnetsWithChildren.push(
          await this.buildSubnetWithRedundancy(sn /*, subnetRedundancy*/),
        );
      }

      // Aggregation: Hat irgendein Unterobjekt Redundanz?
      /*
      const hasRedundancy =
        ipSpaceRedundancy.get(space.id) === true ||
        blocksWithStuff.some((b) => !!b.hasRedundancy) ||
        subnetsWithChildren.some((s) => !!s.hasRedundancy);
      */

      enrichedSpaces.push({
        ...space,
        addressBlocks: blocksWithStuff,
        subnets: subnetsWithChildren,
        // hasRedundancy,
      });
    }

    return mapGlobalLight(globalConfig, enrichedSpaces);
  }

  /** Rekursiv für AddressBlock */
  private async buildBlockTreeWithRedundancy(
    block: AddressBlock,
    /*blockRedundancy: Map<number, boolean>,*/
  ): Promise<AddressBlockWithChildren> {
    // Child-Blocks
    const childBlocks = await this.blockRepo.find({
      where: { parentId: block.id },
    });
    // const childBlockIds = childBlocks.map((b) => b.id);
    // const childBlockRedundancy = await this.getRedundancyMapForObjectIds(
    //   'addressBlock',
    //   childBlockIds,
    // );

    const childTrees = await Promise.all(
      childBlocks.map((b) =>
        this.buildBlockTreeWithRedundancy(b /*, childBlockRedundancy*/),
      ),
    );

    // Subnets im Block
    const subnets = await this.subnetRepo.find({
      where: { addressBlockId: block.id },
    });
    // const subnetIds = subnets.map((sn) => sn.id);
    // const subnetRedundancy = await this.getRedundancyMapForObjectIds(
    //   'subnet',
    //   subnetIds,
    // );

    const subnetsWithChildren: SubnetWithChildren[] = [];
    for (const sn of subnets) {
      subnetsWithChildren.push(
        await this.buildSubnetWithRedundancy(sn /*, subnetRedundancy*/),
      );
    }

    // const hasRedundancy =
    //   blockRedundancy.get(block.id) === true ||
    //   childTrees.some((c) => !!c.hasRedundancy) ||
    //   subnetsWithChildren.some((s) => !!s.hasRedundancy);

    return {
      ...block,
      children: childTrees,
      subnets: subnetsWithChildren,
      // hasRedundancy,
    };
  }

  /** Subnet mit Ranges und Fixeds */
  private async buildSubnetWithRedundancy(
    sn: Subnet,
    /*subnetRedundancy: Map<number, boolean>,*/
  ): Promise<SubnetWithChildren> {
    // --- Ranges ---
    const rangeEntities = await this.rangeRepo.find({
      where: { subnetId: sn.id },
    });
    // const rangeIds = rangeEntities.map((r) => r.id);
    // const rangeRedundancy = await this.getRedundancyMapForObjectIds(
    //   'range',
    //   rangeIds,
    // );

    const rangesWithChildren: RangeWithChildren[] = [];
    for (const r of rangeEntities) {
      rangesWithChildren.push(
        await this.buildRangeWithRedundancy(r /*, rangeRedundancy*/),
      );
    }

    // --- Direct FixedAddresses (ohne Range) ---
    const fixedAddresses = await this.fixedRepo.find({
      where: { subnetId: sn.id, rangeId: IsNull() },
      order: { address: 'ASC' },
    });
    // const fixedIds = fixedAddresses.map((fa) => fa.id);
    // const fixedRedundancy = await this.getRedundancyMapForObjectIds(
    //   'fixedAddress',
    //   fixedIds,
    // );

    // const fixedWithRedundancy: FixedAddressWithRedundancy[] =
    //   fixedAddresses.map((fa) => ({
    //     ...fa,
    //     hasRedundancy: fixedRedundancy.get(fa.id) === true,
    //   }));

    // const hasRedundancy =
    //   subnetRedundancy.get(sn.id) === true ||
    //   rangesWithChildren.some((r) => !!r.hasRedundancy) ||
    //   fixedWithRedundancy.some((fa) => !!fa.hasRedundancy);

    return {
      ...sn,
      ranges: rangesWithChildren,
      // fixedAddresses: fixedWithRedundancy,
      fixedAddresses: fixedAddresses,
      // hasRedundancy,
    };
  }

  /** Range mit FixedAddresses */
  private async buildRangeWithRedundancy(
    r: Range,
    /*rangeRedundancy: Map<number, boolean>,*/
  ): Promise<RangeWithChildren> {
    const fixedAddresses = await this.fixedRepo.find({
      where: { rangeId: r.id },
      order: { address: 'ASC' },
    });
    // const fixedIds = fixedAddresses.map((fa) => fa.id);
    // const fixedRedundancy = await this.getRedundancyMapForObjectIds(
    //   'fixedAddress',
    //   fixedIds,
    // );

    // const fixedWithRedundancy: FixedAddressWithRedundancy[] =
    //   fixedAddresses.map((fa) => ({
    //     ...fa,
    //     hasRedundancy: fixedRedundancy.get(fa.id) === true,
    //   }));

    // const hasRedundancy =
    //   rangeRedundancy.get(r.id) === true ||
    //   fixedWithRedundancy.some((fa) => !!fa.hasRedundancy);

    return {
      ...r,
      // fixedAddresses: fixedWithRedundancy,
      fixedAddresses: fixedAddresses,
      // hasRedundancy,
    };
  }
}
