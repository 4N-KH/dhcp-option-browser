// src/application/services/option-hierarchy/csp/csp-dhcp-hierarchy.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';

import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { AddressBlock } from '@/infrastructure/database/csp/adress-block.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';

import {
  mapGlobalConfigToDto,
  mapIpSpaceToDto,
  mapAddressBlockToDto,
  mapSubnetToDto,
} from './dhcp-tree-mapper';
import {
  GlobalDhcpConfigTreeDto,
  IpSpaceTreeDto,
  AddressBlockTreeDto,
  SubnetTreeDto,
} from '@/domain/dto/csp/dhcp-tree.dto';

@Injectable()
export class CspDhcpHierarchyService {
  constructor(
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(AddressBlock)
    private readonly addressBlockRepo: Repository<AddressBlock>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(FixedAddress)
    private readonly fixedAddressRepo: Repository<FixedAddress>,
  ) {}

  /**
   * Lädt den vollständigen DHCP-Config-Baum aus der Datenbank und wandelt ihn in ein GlobalDhcpConfigTreeDto um.
   * Ist keine Konfiguration vorhanden, wird ein leeres Dto-Objekt (mit leeren Feldern) zurückgegeben.
   */
  async getFullDhcpHierarchy(): Promise<GlobalDhcpConfigTreeDto> {
    // 1. Lade globalConfig (id ASC, alle Relationen), aber gib leeres Dto zurück falls nicht vorhanden.
    const globalConfig = await this.globalConfigRepo.findOne({
      where: {},
      order: { id: 'ASC' },
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
      ],
    });

    // 2. IP Spaces laden
    const ipSpaces = await this.ipSpaceRepo.find({
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
        'addressBlocks',
      ],
      order: { name: 'ASC' },
    });

    // 3. Für jeden IpSpace: AddressBlocks und direkt zugeordnete Subnetze (ohne AddressBlock!) rekursiv vollständig laden
    for (const ipSpace of ipSpaces) {
      // Rekursiv AddressBlocks laden (mit ihren Subnets und Kindern)
      ipSpace.addressBlocks = await this.loadAddressBlockTree(
        ipSpace.addressBlocks,
      );

      // Alle Subnets direkt unter dem IpSpace (addressBlockId IS NULL)
      const orphanSubnets = await this.subnetRepo.find({
        where: { spaceId: ipSpace.id, addressBlockId: IsNull() },
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
        ],
        order: { name: 'ASC' },
      });

      // Für jede orphanSubnet alle Ranges + FixedAddresses nachladen!
      for (const subnet of orphanSubnets) {
        // Ranges
        const ranges = await this.rangeRepo.find({
          where: { subnetId: subnet.id } as FindOptionsWhere<Range>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
            'exclusionRanges',
          ],
          order: { name: 'ASC' },
        });
        (subnet as Subnet & { ranges: Range[] }).ranges = ranges;

        // FixedAddresses pro Range
        for (const range of ranges) {
          const fixedAddresses = await this.fixedAddressRepo.find({
            where: { rangeId: range.id } as FindOptionsWhere<FixedAddress>,
            relations: [
              'dhcpOptions.optionCode',
              'dhcpOptions.optionSpace',
              'optionGroups.optionGroup',
            ],
            order: { name: 'ASC' },
          });
          (range as Range & { fixedAddresses: FixedAddress[] }).fixedAddresses =
            fixedAddresses;
        }

        // FixedAddresses direkt auf Subnet
        const fixedAddressesSubnet = await this.fixedAddressRepo.find({
          where: { subnetId: subnet.id } as FindOptionsWhere<FixedAddress>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
          ],
          order: { name: 'ASC' },
        });
        (subnet as Subnet & { fixedAddresses: FixedAddress[] }).fixedAddresses =
          fixedAddressesSubnet;
      }

      // Subnets dem IpSpace zuweisen!
      (ipSpace as IpSpace & { subnets: Subnet[] }).subnets = orphanSubnets;
    }

    // 4. Wenn keine globale Konfiguration existiert, gib ein leeres/fallback Objekt mit ipSpaces zurück.
    if (!globalConfig) {
      return {
        id: 0,
        comment: null,
        dhcpOptions: [],
        optionGroups: [],
        ipSpaces: ipSpaces.map(mapIpSpaceToDto),
      };
    }

    // 5. Ansonsten: Komplettes Mapping
    return mapGlobalConfigToDto(globalConfig, ipSpaces);
  }

  /**
   * Rekursive AddressBlock-Logik inkl. aller Subnets, Ranges, FixedAddresses, Children.
   */
  private async loadAddressBlockTree(
    blocks: AddressBlock[],
  ): Promise<AddressBlock[]> {
    const result: AddressBlock[] = [];
    for (const block of blocks) {
      // Children rekursiv laden
      const children = await this.addressBlockRepo.find({
        where: { parentId: block.id },
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
          'children',
        ],
        order: { name: 'ASC' },
      });
      block.children = await this.loadAddressBlockTree(children);

      // Subnets unter diesem Block
      const subnets = await this.subnetRepo.find({
        where: { addressBlockId: block.id } as FindOptionsWhere<Subnet>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
        ],
        order: { name: 'ASC' },
      });

      // Ranges + FixedAddresses pro Subnet
      for (const subnet of subnets) {
        const ranges = await this.rangeRepo.find({
          where: { subnetId: subnet.id } as FindOptionsWhere<Range>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
            'exclusionRanges',
          ],
          order: { name: 'ASC' },
        });
        (subnet as Subnet & { ranges: Range[] }).ranges = ranges;

        for (const range of ranges) {
          const fixedAddresses = await this.fixedAddressRepo.find({
            where: { rangeId: range.id } as FindOptionsWhere<FixedAddress>,
            relations: [
              'dhcpOptions.optionCode',
              'dhcpOptions.optionSpace',
              'optionGroups.optionGroup',
            ],
            order: { name: 'ASC' },
          });
          (range as Range & { fixedAddresses: FixedAddress[] }).fixedAddresses =
            fixedAddresses;
        }

        const fixedAddressesSubnet = await this.fixedAddressRepo.find({
          where: { subnetId: subnet.id } as FindOptionsWhere<FixedAddress>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
          ],
          order: { name: 'ASC' },
        });
        (subnet as Subnet & { fixedAddresses: FixedAddress[] }).fixedAddresses =
          fixedAddressesSubnet;
      }

      (block as AddressBlock & { subnets: Subnet[] }).subnets = subnets;
      result.push(block);
    }
    return result;
  }

  // --- Einzelhierarchien (bleiben wie gehabt, werden robust gebaut) ---

  async loadOrphanSubnetsForIpSpace(ipSpaceId: number): Promise<Subnet[]> {
    // Bereits vollständig in getFullDhcpHierarchy berücksichtigt!
    return this.subnetRepo.find({
      where: { spaceId: ipSpaceId, addressBlockId: IsNull() },
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
      ],
      order: { name: 'ASC' },
    });
  }

  async getIpSpaceHierarchy(ipSpaceId: number): Promise<IpSpaceTreeDto | null> {
    const ipSpace = await this.ipSpaceRepo.findOne({
      where: { id: ipSpaceId },
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
        'addressBlocks',
      ],
    });
    if (!ipSpace) return null;

    ipSpace.addressBlocks = await this.loadAddressBlockTree(
      ipSpace.addressBlocks,
    );

    // orphan subnets auch für Einzelbaum immer nachladen und zuweisen
    const orphanSubnets = await this.loadOrphanSubnetsForIpSpace(ipSpace.id);

    // Ranges/Fixeds nachladen (analog wie oben)
    for (const subnet of orphanSubnets) {
      const ranges = await this.rangeRepo.find({
        where: { subnetId: subnet.id } as FindOptionsWhere<Range>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
          'exclusionRanges',
        ],
        order: { name: 'ASC' },
      });
      (subnet as Subnet & { ranges: Range[] }).ranges = ranges;

      for (const range of ranges) {
        const fixedAddresses = await this.fixedAddressRepo.find({
          where: { rangeId: range.id } as FindOptionsWhere<FixedAddress>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
          ],
          order: { name: 'ASC' },
        });
        (range as Range & { fixedAddresses: FixedAddress[] }).fixedAddresses =
          fixedAddresses;
      }

      const fixedAddressesSubnet = await this.fixedAddressRepo.find({
        where: { subnetId: subnet.id } as FindOptionsWhere<FixedAddress>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
        ],
        order: { name: 'ASC' },
      });
      (subnet as Subnet & { fixedAddresses: FixedAddress[] }).fixedAddresses =
        fixedAddressesSubnet;
    }
    (ipSpace as IpSpace & { subnets: Subnet[] }).subnets = orphanSubnets;

    return mapIpSpaceToDto(ipSpace);
  }

  async getAddressBlockHierarchy(
    blockId: number,
  ): Promise<AddressBlockTreeDto | null> {
    const block = await this.addressBlockRepo.findOne({
      where: { id: blockId },
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
        'children',
      ],
    });
    if (!block) return null;
    block.children = await this.loadAddressBlockTree(block.children);

    const subnets = await this.subnetRepo.find({
      where: { addressBlockId: block.id } as FindOptionsWhere<Subnet>,
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
      ],
      order: { name: 'ASC' },
    });

    for (const subnet of subnets) {
      const ranges = await this.rangeRepo.find({
        where: { subnetId: subnet.id } as FindOptionsWhere<Range>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
          'exclusionRanges',
        ],
        order: { name: 'ASC' },
      });
      (subnet as Subnet & { ranges: Range[] }).ranges = ranges;

      for (const range of ranges) {
        const fixedAddresses = await this.fixedAddressRepo.find({
          where: { rangeId: range.id } as FindOptionsWhere<FixedAddress>,
          relations: [
            'dhcpOptions.optionCode',
            'dhcpOptions.optionSpace',
            'optionGroups.optionGroup',
          ],
          order: { name: 'ASC' },
        });
        (range as Range & { fixedAddresses: FixedAddress[] }).fixedAddresses =
          fixedAddresses;
      }

      const fixedAddressesSubnet = await this.fixedAddressRepo.find({
        where: { subnetId: subnet.id } as FindOptionsWhere<FixedAddress>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
        ],
        order: { name: 'ASC' },
      });
      (subnet as Subnet & { fixedAddresses: FixedAddress[] }).fixedAddresses =
        fixedAddressesSubnet;
    }

    (block as AddressBlock & { subnets: Subnet[] }).subnets = subnets;
    return mapAddressBlockToDto(block);
  }

  async getSubnetTree(subnetId: number): Promise<SubnetTreeDto | null> {
    const subnet = await this.subnetRepo.findOne({
      where: { id: subnetId },
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
      ],
    });
    if (!subnet) return null;

    const ranges = await this.rangeRepo.find({
      where: { subnetId: subnet.id } as FindOptionsWhere<Range>,
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
        'exclusionRanges',
      ],
      order: { name: 'ASC' },
    });
    (subnet as Subnet & { ranges: Range[] }).ranges = ranges;

    for (const range of ranges) {
      const fixedAddresses = await this.fixedAddressRepo.find({
        where: { rangeId: range.id } as FindOptionsWhere<FixedAddress>,
        relations: [
          'dhcpOptions.optionCode',
          'dhcpOptions.optionSpace',
          'optionGroups.optionGroup',
        ],
        order: { name: 'ASC' },
      });
      (range as Range & { fixedAddresses: FixedAddress[] }).fixedAddresses =
        fixedAddresses;
    }

    const fixedAddressesSubnet = await this.fixedAddressRepo.find({
      where: { subnetId: subnet.id } as FindOptionsWhere<FixedAddress>,
      relations: [
        'dhcpOptions.optionCode',
        'dhcpOptions.optionSpace',
        'optionGroups.optionGroup',
      ],
      order: { name: 'ASC' },
    });
    (subnet as Subnet & { fixedAddresses: FixedAddress[] }).fixedAddresses =
      fixedAddressesSubnet;

    return mapSubnetToDto(subnet);
  }
}
