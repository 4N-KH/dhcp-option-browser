import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from '@/infrastructure/database/csp/global-config-option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';

import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';
import { EncodingSanitizer } from '../transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
// Service for importing global DHCPv4 configuration from CSP
export class CspGlobalConfigImportService {
  private readonly logger = new Logger(CspGlobalConfigImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
    @InjectRepository(DhcpGlobalConfigOption)
    private readonly globalConfigOptionRepo: Repository<DhcpGlobalConfigOption>,
    @InjectRepository(DhcpGlobalConfigOptionGroup)
    private readonly globalConfigOptionGroupRepo: Repository<DhcpGlobalConfigOptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    @Inject(DefaultEncodingSanitizerService)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  // Imports the global DHCPv4 configuration, supporting progress and cancellation
  async importGlobalDhcpConfig(
    opts?: InterruptibleImportOptions,
  ): Promise<DhcpGlobalConfig | null> {
    this.logger.log('Importing global DHCPv4 configuration from CSP...');

    // Cancellation check
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('GlobalConfig import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    // Fetch global config from CSP
    const rawGlobalConfig = await this.cspDataClient.fetchGlobalDhcpConfig();

    this.logger.verbose(
      `Received from CSP: ${JSON.stringify(rawGlobalConfig, null, 2)}`,
    );

    // Check for empty configuration
    const isEmpty =
      !rawGlobalConfig ||
      typeof rawGlobalConfig !== 'object' ||
      ((!Array.isArray(rawGlobalConfig.dhcp_options) ||
        rawGlobalConfig.dhcp_options.length === 0) &&
        (!rawGlobalConfig.comment ||
          rawGlobalConfig.comment === null ||
          rawGlobalConfig.comment === ''));

    if (isEmpty) {
      this.logger.log(
        'No global options and no comment – nothing to store as central configuration.',
      );
      // Remove all previous global config and related data
      const configs = await this.globalConfigRepo.find();
      for (const config of configs) {
        await this.globalConfigOptionRepo.delete({ globalConfigId: config.id });
        await this.globalConfigOptionGroupRepo.delete({
          globalConfigId: config.id,
        });
        await this.globalConfigRepo.delete(config.id);
      }
      return null;
    }

    // Remove old config and relations
    const existing = await this.globalConfigRepo.findOne({
      relations: ['dhcpOptions', 'optionGroups'],
      where: {},
    });
    if (existing) {
      await this.globalConfigOptionRepo.delete({ globalConfigId: existing.id });
      await this.globalConfigOptionGroupRepo.delete({
        globalConfigId: existing.id,
      });
      await this.globalConfigRepo.delete(existing.id);
    }

    // Normalise all DHCP options
    const normalisedDhcpOptions = normalizeDhcpOptions(
      Array.isArray(rawGlobalConfig.dhcp_options)
        ? rawGlobalConfig.dhcp_options
        : [],
    );

    // Select only real (non-group) options
    const realOptions = normalisedDhcpOptions.filter(
      (opt) => opt.type !== 'group',
    );

    // Progress reporting setup
    const total =
      realOptions.length +
      (Array.isArray(normalisedDhcpOptions) ? normalisedDhcpOptions.length : 0);
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    // Sanitize config comment
    const sanitizedComment = this.encodingSanitizer.sanitize(
      rawGlobalConfig?.comment ?? '',
    );

    checkCancel();
    // Create and store new config entity
    const globalConfig = this.globalConfigRepo.create({
      comment: sanitizedComment,
    });
    await this.globalConfigRepo.save(globalConfig);

    // Prepare map for option code resolution
    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

    // Save all real DHCP options
    if (realOptions.length > 0) {
      for (const opt of realOptions) {
        checkCancel();
        const sanitizedOpt = {
          ...opt,
          option_value: this.encodingSanitizer.sanitize(opt.option_value ?? ''),
        };
        const dhcpOptionEntity = this.globalConfigOptionRepo.create({
          globalConfig,
          globalConfigId: globalConfig.id,
          ...mapDhcpOptionToEntity<DhcpGlobalConfigOption>(
            sanitizedOpt,
            optionCodeMap,
          ),
        });
        await this.globalConfigOptionRepo.save(dhcpOptionEntity);
        progress++;
        report();
      }
    }

    // Build OptionGroup map for group assignment
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of await this.optionGroupRepo.find()) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    // Assign option groups (from all options)
    const foundGroups = resolveOptionGroupsFromOptions(
      normalisedDhcpOptions,
      optionGroupMap,
      null,
    );
    if (foundGroups.length > 0) {
      for (const optionGroup of foundGroups) {
        checkCancel();
        const gcogEntity = this.globalConfigOptionGroupRepo.create({
          globalConfig,
          globalConfigId: globalConfig.id,
          optionGroup,
          optionGroupId: optionGroup.id,
        });
        await this.globalConfigOptionGroupRepo.save(gcogEntity);
        progress++;
        report();
      }
    }

    // Load and return result with relations
    const result = await this.globalConfigRepo.findOneOrFail({
      where: { id: globalConfig.id },
      relations: ['dhcpOptions', 'optionGroups', 'optionGroups.optionGroup'],
    });

    this.logger.log(
      `Imported global DHCP config with ${result.dhcpOptions?.length ?? 0} options and ${result.optionGroups?.length ?? 0} option groups.`,
    );

    return result;
  }
}
