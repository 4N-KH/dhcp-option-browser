import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { SubnetDhcpOption } from '@/infrastructure/database/csp/subnet-dhcp-option.entity';
import { SubnetOptionGroup } from '@/infrastructure/database/csp/subnet-option-group.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { AddressBlock } from '@/infrastructure/database/csp/address-block.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';
import type { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

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
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  // Imports subnets including DHCP options, OptionGroups and parent assignment
  async importSubnets(opts?: InterruptibleImportOptions): Promise<Subnet[]> {
    this.logger.log('Importing Subnets from CSP...');
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('Subnet import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    // Load Subnet DTOs
    checkCancel();
    const dtos: CspSubnetDto[] = await this.cspDataClient.fetchSubnets();
    if (!dtos?.length) {
      this.logger.warn('No Subnets found in CSP.');
      return [];
    }
    const total = dtos.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    // Load lookup tables for parents, options and groups
    checkCancel();
    const [spaces, addressBlocks, optionCodes, allOptionGroups] =
      await Promise.all([
        this.ipSpaceRepo.find(),
        this.addressBlockRepo.find(),
        this.optionCodeRepo.find({ relations: ['optionSpace'] }),
        this.optionGroupRepo.find(),
      ]);
    const spaceMap = new Map(spaces.map((s) => [s.externalId, s]));
    const addressBlockMap = new Map(
      addressBlocks.map((ab) => [ab.externalId, ab]),
    );
    const optionCodeMap = buildOptionCodeMap(optionCodes);
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

    // Save and create subnets
    const subnetMap = new Map<string, Subnet>();
    for (const dto of dtos) {
      checkCancel();

      let subnet = await this.subnetRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!subnet) subnet = this.subnetRepo.create({ externalId: dto.id });

      subnet.name = this.encodingSanitizer.sanitize(dto.name ?? '');
      subnet.address = this.encodingSanitizer.sanitize(dto.address ?? '');
      subnet.cidr = dto.cidr;
      subnet.comment = dto.comment
        ? this.encodingSanitizer.sanitize(dto.comment)
        : null;

      // Parent assignment (AddressBlock or IpSpace)
      if (dto.parent?.startsWith('ipam/address_block/')) {
        const addressBlock = addressBlockMap.get(dto.parent);
        subnet.addressBlock = addressBlock;
        subnet.addressBlockId = addressBlock?.id;
        subnet.space = undefined;
        subnet.spaceId = undefined;
      } else if (dto.parent?.startsWith('ipam/ip_space/')) {
        const space = spaceMap.get(dto.parent);
        subnet.space = space;
        subnet.spaceId = space?.id;
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
      } else if (dto.space && spaceMap.has(dto.space)) {
        const space = spaceMap.get(dto.space);
        subnet.space = space;
        subnet.spaceId = space?.id;
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
      } else {
        subnet.addressBlock = undefined;
        subnet.addressBlockId = undefined;
        subnet.space = undefined;
        subnet.spaceId = undefined;
        this.logger.warn(
          `No valid parent found for Subnet ${dto.id}: parent=${dto.parent} space=${dto.space}`,
        );
      }

      subnet.dhcpOptions = [];
      subnet.optionGroups = [];
      await this.subnetRepo.save(subnet);
      subnetMap.set(dto.id, subnet);

      progress++;
      report();
    }

    // Import DHCP options
    progress = 0;
    for (const dto of dtos) {
      checkCancel();

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
            opt.type !== 'group',
        );
        const entities = validOptions.map((opt) =>
          this.subnetDhcpOptionRepo.create({
            ...mapDhcpOptionToEntity<SubnetDhcpOption>(opt, optionCodeMap),
            subnet,
            subnetId: subnet.id,
          }),
        );
        if (entities.length > 0) await this.subnetDhcpOptionRepo.save(entities);
      }

      progress++;
      report();
    }

    // Assign OptionGroups
    progress = 0;
    for (const dto of dtos) {
      checkCancel();

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

      for (const optionGroup of foundGroups) {
        await this.subnetOptionGroupRepo.save(
          this.subnetOptionGroupRepo.create({
            subnet,
            subnetId: subnet.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          }),
        );
      }

      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${subnetMap.size} Subnets including DHCP options and OptionGroups imported.`,
    );
    return Array.from(subnetMap.values());
  }
}
