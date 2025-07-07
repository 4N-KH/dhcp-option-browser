import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { SubnetDhcpOption } from '@/infrastructure/database/csp/subnet-dhcp-option.entity';
import { SubnetOptionGroup } from '@/infrastructure/database/csp/subnet-option-group.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { AddressBlock } from '@/infrastructure/database/csp/adress-block.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';

@Injectable()
export class CspSubnetImportService {
  private readonly logger = new Logger(CspSubnetImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(AddressBlock)
    private readonly addressBlockRepo: Repository<AddressBlock>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(SubnetDhcpOption)
    private readonly subnetDhcpOptionRepo: Repository<SubnetDhcpOption>,
    @InjectRepository(SubnetOptionGroup)
    private readonly subnetOptionGroupRepo: Repository<SubnetOptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
  ) {}

  /**
   * Imports all Subnets including DHCP options, OptionGroups and correct parent assignment (CSP-conform).
   */
  async importSubnets(): Promise<Subnet[]> {
    this.logger.log('Importing Subnets from CSP...');

    // Fetch Subnet DTOs from CSP
    const dtos = await this.cspDataClient.fetchSubnets();
    if (!dtos?.length) {
      this.logger.warn('No Subnets found in CSP.');
      return [];
    }

    // Prepare lookup maps for parents
    const spaceMap = new Map<string, IpSpace>();
    for (const s of await this.ipSpaceRepo.find()) {
      if (s.externalId) spaceMap.set(s.externalId, s);
    }
    const addressBlockMap = new Map<string, AddressBlock>();
    for (const ab of await this.addressBlockRepo.find()) {
      if (ab.externalId) addressBlockMap.set(ab.externalId, ab);
    }

    // OptionCodes und OptionGroups als Maps (beide Utilities)
    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

    const allOptionGroups = await this.optionGroupRepo.find();
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      const m = og.externalId
        ?.trim()
        .toLowerCase()
        .match(/^dhcp\/option_group\/(.+)$/);
      if (m) optionGroupMap.set(m[1], og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    // Create or update Subnets
    const subnetMap = new Map<string, Subnet>();
    for (const dto of dtos) {
      let subnet = await this.subnetRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!subnet) subnet = this.subnetRepo.create({ externalId: dto.id });

      subnet.name = dto.name;
      subnet.address = dto.address;
      subnet.cidr = dto.cidr;
      subnet.comment = dto.comment ?? null;

      // Parent logic: AddressBlock or IpSpace
      if (dto.parent?.startsWith('ipam/address_block/')) {
        const addressBlock = addressBlockMap.get(dto.parent);
        if (!addressBlock) {
          this.logger.warn(
            `AddressBlock parent not found for Subnet ${dto.id}: ${dto.parent}`,
          );
        }
        subnet.addressBlock = addressBlock;
        subnet.addressBlockId = addressBlock?.id;
        subnet.space = undefined;
        subnet.spaceId = undefined;
      } else if (dto.parent?.startsWith('ipam/ip_space/')) {
        const space = spaceMap.get(dto.parent);
        if (!space) {
          this.logger.warn(
            `IpSpace parent not found for Subnet ${dto.id}: ${dto.parent}`,
          );
        }
        subnet.space = space;
        subnet.spaceId = space?.id;
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
      } else if (dto.space && spaceMap.has(dto.space)) {
        // Legacy fallback: explicit space
        const space = spaceMap.get(dto.space);
        subnet.space = space;
        subnet.spaceId = space?.id;
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
      } else {
        this.logger.warn(
          `No valid parent found for Subnet ${dto.id}: parent=${dto.parent} space=${dto.space}`,
        );
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
        subnet.space = undefined;
        subnet.spaceId = undefined;
      }

      subnet.dhcpOptions = [];
      subnet.optionGroups = [];
      await this.subnetRepo.save(subnet);
      subnetMap.set(dto.id, subnet);
    }

    // DHCP Options für jedes Subnet importieren (NUR Optionen, KEINE Gruppen)
    for (const dto of dtos) {
      const subnet = subnetMap.get(dto.id);
      if (!subnet) continue;

      await this.subnetDhcpOptionRepo.delete({ subnetId: subnet.id });

      if (Array.isArray(dto.dhcp_options)) {
        const validOptions = dto.dhcp_options.filter(
          (
            opt,
          ): opt is {
            group?: string | null;
            option_code: string;
            option_value: string;
            type: string;
          } =>
            !!opt &&
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string' &&
            opt.type !== 'group', // NUR echte Optionen!
        );
        const entities = validOptions.map((opt) =>
          this.subnetDhcpOptionRepo.create({
            ...mapDhcpOptionToEntity<SubnetDhcpOption>(opt, optionCodeMap),
            subnet,
            subnetId: subnet.id,
          }),
        );
        if (entities.length > 0) {
          await this.subnetDhcpOptionRepo.save(entities);
        }
      }
    }

    // OptionGroups-Zuordnung für jedes Subnet (analog AddressBlock)
    let totalAssigned = 0;
    let totalSubnetsWithGroups = 0;

    for (const dto of dtos) {
      const subnet = subnetMap.get(dto.id);
      if (!subnet) continue;

      await this.subnetOptionGroupRepo.delete({ subnetId: subnet.id });

      let groupKeys = Array.isArray(dto.dhcp_options)
        ? dto.dhcp_options
            .map((opt) =>
              typeof opt.group === 'string'
                ? opt.group.trim().toLowerCase()
                : null,
            )
            .filter((g): g is string => !!g)
        : [];
      groupKeys = Array.from(new Set(groupKeys));

      const foundGroups = resolveOptionGroupsFromOptions(
        dto.dhcp_options,
        optionGroupMap,
        null,
      );

      // Optionale Kurzlogik wie bei AddressBlock
      let resolveLog = '';
      let logCount = 0;
      for (const groupKey of groupKeys) {
        const og =
          optionGroupMap.get(groupKey) ||
          optionGroupMap.get(groupKey.replace(/^dhcp\/option_group\//, '')) ||
          Array.from(optionGroupMap.values()).find(
            (g) =>
              g.externalId?.trim().toLowerCase() === groupKey ||
              g.name?.trim().toLowerCase() === groupKey,
          );
        if (logCount < 3) {
          if (og) {
            resolveLog += `  ✔ [${subnet.address ?? subnet.externalId}] groupKey='${groupKey}' -> OptionGroup='${og.name}' (id=${og.id})\n`;
          } else {
            resolveLog += `  ✘ [${subnet.address ?? subnet.externalId}] groupKey='${groupKey}' -> NOT FOUND\n`;
          }
        }
        logCount++;
      }
      if (resolveLog) {
        this.logger.log(
          `[OptionGroup-Resolve] Subnet: ${subnet.address ?? subnet.externalId} (id=${subnet.id})\n${resolveLog}${
            logCount > 3 ? '  ...' : ''
          }`,
        );
      }

      if (foundGroups.length > 0) {
        totalSubnetsWithGroups++;
      }
      for (const optionGroup of foundGroups) {
        await this.subnetOptionGroupRepo.save(
          this.subnetOptionGroupRepo.create({
            subnet,
            subnetId: subnet.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          }),
        );
        totalAssigned++;
      }
      if (foundGroups.length === 0 && groupKeys.length > 0) {
        this.logger.warn(
          `[NO_MATCH] Subnet '${subnet.address ?? subnet.externalId}' (ID=${subnet.id}) - keine OptionGroups gefunden für: ${groupKeys.join(', ')}`,
        );
      }
    }

    this.logger.log(
      `Import complete: ${subnetMap.size} Subnets including DHCP options and OptionGroups (with OptionSpace) and correct AddressBlock/IpSpace parents saved. Zuordnungen gespeichert: ${totalAssigned} Subnet-OptionGroups (${totalSubnetsWithGroups} Subnets mit mindestens einer Zuordnung).`,
    );
    return Array.from(subnetMap.values());
  }
}
