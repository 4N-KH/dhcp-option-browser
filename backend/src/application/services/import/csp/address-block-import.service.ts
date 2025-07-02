// backend/src/application/services/import/csp/address-block-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { AddressBlock } from '@/infrastructure/database/csp/adress-block.entity';
import { AddressBlockDhcpOption } from '@/infrastructure/database/csp/address-block-dhcp-option.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { AddressBlockOptionGroup } from '@/infrastructure/database/csp/address-block-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { normalizeAddressBlockDtos } from '@/shared/parser/normalize-address-block-dtos';

@Injectable()
export class CspAddressBlockImportService {
  private readonly logger = new Logger(CspAddressBlockImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(AddressBlock)
    private readonly addressBlockRepo: Repository<AddressBlock>,
    @InjectRepository(AddressBlockDhcpOption)
    private readonly abDhcpOptionRepo: Repository<AddressBlockDhcpOption>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(AddressBlockOptionGroup)
    private readonly abOptionGroupRepo: Repository<AddressBlockOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
  ) {}

  /**
   * Importiert alle Address Blocks inkl. Parent-Relationen, DHCP-Optionen und zugehöriger OptionGroups.
   * Die OptionGroups werden dynamisch aus allen group-IDs der gesetzten dhcp_options berechnet.
   */
  async importAddressBlocks(): Promise<AddressBlock[]> {
    this.logger.log('Importing Address Blocks from CSP...');

    // Rohdaten holen & normalisieren
    const rawDtos = await this.cspDataClient.fetchAddressBlocks();
    const dtos = normalizeAddressBlockDtos(rawDtos);

    if (!dtos?.length) {
      this.logger.warn('No Address Blocks found in CSP.');
      return [];
    }

    // OptionCodes für spätere Zuordnung vorladen
    const allOptionCodes = await this.optionCodeRepo.find();
    const optionCodeMap = new Map<string, OptionCodeEntity>();
    for (const code of allOptionCodes) {
      if (code.externalId) optionCodeMap.set(code.externalId, code);
    }

    // OptionGroups für spätere Zuordnung vorladen
    const allOptionGroups = await this.optionGroupRepo.find();
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (og.externalId) optionGroupMap.set(og.externalId, og);
    }

    // AddressBlocks (ohne Parent) speichern
    const blockMap = new Map<string, AddressBlock>();
    for (const dto of dtos) {
      let block = await this.addressBlockRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!block) {
        block = this.addressBlockRepo.create({
          externalId: dto.id,
        });
      }
      block.name = dto.name;
      block.address = dto.address;
      block.cidr = dto.cidr;
      block.comment = dto.comment ?? null;
      block.dhcpOptions = [];
      block.optionGroups = [];
      await this.addressBlockRepo.save(block);
      blockMap.set(dto.id, block);
    }

    // Parent-Relationen aufbauen
    for (const dto of dtos) {
      if (dto.parent) {
        const childBlock = blockMap.get(dto.id);
        const parentBlock = blockMap.get(dto.parent);
        if (childBlock && parentBlock) {
          childBlock.parent = parentBlock;
          childBlock.parentId = parentBlock.id;
          await this.addressBlockRepo.save(childBlock);
        }
      }
    }

    // DHCP-Optionen zuordnen (1:n)
    for (const dto of dtos) {
      const block = blockMap.get(dto.id);
      if (!block) continue;

      await this.abDhcpOptionRepo.delete({ addressBlockId: block.id });

      if (Array.isArray(dto.dhcp_options)) {
        for (const opt of dto.dhcp_options) {
          const optionCodeRef = optionCodeMap.get(opt.option_code) ?? undefined;

          const abOpt = this.abDhcpOptionRepo.create({
            addressBlock: block,
            addressBlockId: block.id,
            group: typeof opt.group === 'string' ? opt.group : null,
            option_code: opt.option_code,
            option_value: opt.option_value,
            type: opt.type,
            optionCode: optionCodeRef,
            optionCodeId: optionCodeRef?.id,
          });

          await this.abDhcpOptionRepo.save(abOpt);
        }
      }
    }

    // OptionGroups zuordnen: Sammle alle "group" aus dhcp_options als Set, mappe auf OptionGroup und persistiere als address_block_option_group
    for (const dto of dtos) {
      const block = blockMap.get(dto.id);
      if (!block) continue;

      await this.abOptionGroupRepo.delete({ addressBlockId: block.id });

      // Alle group-IDs aus dhcp_options als Set
      const groupIdSet = new Set<string>();
      for (const opt of dto.dhcp_options ?? []) {
        if (typeof opt.group === 'string' && opt.group.length > 0) {
          groupIdSet.add(opt.group);
        }
      }

      for (const groupId of groupIdSet) {
        const optionGroup = optionGroupMap.get(groupId);
        if (optionGroup) {
          const abog = this.abOptionGroupRepo.create({
            addressBlock: block,
            addressBlockId: block.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          });
          await this.abOptionGroupRepo.save(abog);
        }
      }
    }

    this.logger.log(
      `Import complete: ${blockMap.size} Address Blocks and all DHCP options/OptionGroups saved.`,
    );
    return Array.from(blockMap.values());
  }
}
