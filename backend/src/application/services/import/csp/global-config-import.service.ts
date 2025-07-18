import { Injectable, Logger } from '@nestjs/common';
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

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
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
  ) {}

  /**
   * Imports the global DHCPv4 configuration from CSP (with progress/cancel support).
   */
  async importGlobalDhcpConfig(
    opts?: InterruptibleImportOptions,
  ): Promise<DhcpGlobalConfig | null> {
    this.logger.log('Importing global DHCPv4 configuration from CSP...');

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('GlobalConfig import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const rawGlobalConfig = await this.cspDataClient.fetchGlobalDhcpConfig();

    this.logger.verbose(
      `Received from CSP: ${JSON.stringify(rawGlobalConfig, null, 2)}`,
    );

    // If empty, delete everything
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
      // Delete all config data (and relations)
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

    // Remove any previous config (and relations)
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

    // Normalise DHCP options
    const normalisedDhcpOptions = normalizeDhcpOptions(
      Array.isArray(rawGlobalConfig.dhcp_options)
        ? rawGlobalConfig.dhcp_options
        : [],
    );

    // Split in echte Optionen und Gruppen
    const realOptions = normalisedDhcpOptions.filter(
      (opt) => opt.type !== 'group',
    );

    // Anzahl Steps: Optionen + Gruppen
    const total =
      realOptions.length +
      (Array.isArray(normalisedDhcpOptions) ? normalisedDhcpOptions.length : 0);
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    // Create new config
    checkCancel();
    const globalConfig = this.globalConfigRepo.create({
      comment: rawGlobalConfig?.comment ?? null,
    });
    await this.globalConfigRepo.save(globalConfig);

    // Build OptionCode map
    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

    // Save all DHCP options (only non-group!)
    if (realOptions.length > 0) {
      for (const opt of realOptions) {
        checkCancel();
        const dhcpOptionEntity = this.globalConfigOptionRepo.create({
          globalConfig,
          globalConfigId: globalConfig.id,
          ...mapDhcpOptionToEntity<DhcpGlobalConfigOption>(opt, optionCodeMap),
        });
        await this.globalConfigOptionRepo.save(dhcpOptionEntity);
        progress++;
        report();
      }
    }

    // OptionGroup map (by externalId, name, id)
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of await this.optionGroupRepo.find()) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    // Assign OptionGroups via utility (aus ALLEN Optionen, nicht nur den echten!)
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

    // Return result (with eager relations)
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
