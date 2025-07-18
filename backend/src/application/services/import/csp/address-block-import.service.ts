import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { AddressBlock } from '@/infrastructure/database/csp/address-block.entity';
import { AddressBlockDhcpOption } from '@/infrastructure/database/csp/address-block-dhcp-option.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { AddressBlockOptionGroup } from '@/infrastructure/database/csp/address-block-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { normalizeAddressBlockDtos } from '@/shared/parser/normalize-address-block-dtos';

import {
  mapDhcpOptionToEntity,
  buildOptionCodeMap,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

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
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    @InjectRepository(AddressBlockOptionGroup)
    private readonly abOptionGroupRepo: Repository<AddressBlockOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Interruptible & progress-reporting import for all Address Blocks.
   * Transactional, rollback-capable, idempotent.
   */
  async importAddressBlocks(
    opts?: InterruptibleImportOptions,
  ): Promise<AddressBlock[]> {
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('AddressBlock import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    return this.dataSource.transaction(async (manager) => {
      this.logger.warn(
        'FULL REPLACE: All AddressBlock-related tables will be truncated using CASCADE within this transaction and freshly rebuilt.',
      );

      // 0. TRUNCATE with CASCADE for all dependent tables
      const queryRunner = manager.queryRunner!;
      await queryRunner.query(
        'TRUNCATE TABLE "address_block_option_group", "address_block_dhcp_option", "address_block" CASCADE;',
      );

      // 1. Fetch and normalise data
      checkCancel();
      const rawDtos = await this.cspDataClient.fetchAddressBlocks();
      const dtos = normalizeAddressBlockDtos(rawDtos);

      if (!dtos?.length) {
        this.logger.warn('No Address Blocks found in CSP.');
        return [];
      }

      // 2. Prepare lookup maps (OptionCodes, OptionGroups, IpSpaces)
      const [allOptionCodes, allOptionGroups, allIpSpaces] = await Promise.all([
        this.optionCodeRepo.find({ relations: ['optionSpace'] }),
        this.optionGroupRepo.find(),
        this.ipSpaceRepo.find(),
      ]);
      const optionCodeMap = buildOptionCodeMap(allOptionCodes);

      const optionGroupMap = new Map<string, OptionGroup>();
      for (const og of allOptionGroups) {
        if (!og) continue;
        if (og.externalId)
          optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
        if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
        if (og.id) optionGroupMap.set(String(og.id), og);
      }
      const ipSpaceMap = new Map(allIpSpaces.map((i) => [i.externalId, i]));

      // Progress config
      const total = dtos.length;
      let progress = 0;
      const report = () => opts?.onProgress?.(progress, total);

      // 3. Create AddressBlocks (without parent linkage yet, for IDs to be set)
      const blockMap = new Map<string, AddressBlock>();
      for (const dto of dtos) {
        checkCancel();

        const block = manager.create(AddressBlock, { externalId: dto.id });
        block.name = dto.name;
        block.address = dto.address;
        block.cidr = dto.cidr;
        block.comment = dto.comment ?? null;

        // Assign ipSpace if available
        const foundIpSpace = dto.space ? ipSpaceMap.get(dto.space) : undefined;
        if (foundIpSpace) {
          block.ipSpace = foundIpSpace;
          block.ipSpaceId = foundIpSpace.id;
        } else {
          block.ipSpace = undefined;
          block.ipSpaceId = undefined;
        }

        block.dhcpOptions = [];
        block.optionGroups = [];

        const saved = await manager.save(block);
        blockMap.set(dto.id, saved);

        progress++;
        report();
      }

      // 4. Establish parent-child relations now that all blocks have IDs
      for (const dto of dtos) {
        checkCancel();
        if (dto.parent) {
          const childBlock = blockMap.get(dto.id);
          const parentBlock = blockMap.get(dto.parent);
          if (childBlock && parentBlock) {
            childBlock.parent = parentBlock;
            childBlock.parentId = parentBlock.id;
            await manager.save(childBlock);
          } else if (!parentBlock) {
            this.logger.warn(
              `Parent AddressBlock for ${dto.id} (parent: ${dto.parent}) not found!`,
            );
          }
        }
      }

      // 5. Save DHCP options per block
      for (const dto of dtos) {
        checkCancel();
        const block = blockMap.get(dto.id);
        if (!block || !block.id) {
          this.logger.warn(
            `[SKIP] No valid AddressBlock entity for dto.id=${dto.id}, options not imported!`,
          );
          continue;
        }

        if (Array.isArray(dto.dhcp_options)) {
          const validOptions = dto.dhcp_options.filter(
            (
              opt,
            ): opt is {
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
          for (const opt of validOptions) {
            checkCancel();
            if (!block.id) {
              this.logger.error(
                `[FATAL] Block entity for option_code=${opt.option_code} on dto.id=${dto.id} is missing id. Skipping.`,
              );
              continue;
            }
            const abOpt = manager.create(AddressBlockDhcpOption, {
              ...mapDhcpOptionToEntity<AddressBlockDhcpOption>(
                opt,
                optionCodeMap,
              ),
              addressBlock: block,
              addressBlockId: block.id,
            });
            if (!abOpt.addressBlockId) {
              this.logger.error(
                `[FATAL] Created AddressBlockDhcpOption without addressBlockId (option_code=${opt.option_code}, dto.id=${dto.id}). Skipping.`,
              );
              continue;
            }
            await manager.save(abOpt);
          }
        }
      }

      // 6. Assign option groups to each block
      for (const dto of dtos) {
        checkCancel();
        const block = blockMap.get(dto.id);
        if (!block || !block.id) continue;

        // Extract group keys from options
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
          checkCancel();
          if (!block.id || !optionGroup?.id) continue;
          await manager.save(AddressBlockOptionGroup, {
            addressBlock: block,
            addressBlockId: block.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          });
        }
      }

      this.logger.log(
        `Import complete: ${blockMap.size} Address Blocks successfully imported (FULL REPLACE, rollback-capable, TRUNCATE CASCADE).`,
      );
      return Array.from(blockMap.values());
    });
  }
}
