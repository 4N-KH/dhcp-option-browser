import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from '@/infrastructure/database/csp/global-config-option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

import { normalizeAndDedupeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';
import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';

import { EncodingSanitizer } from '../transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

import {
  CspGlobalDhcpConfigSchema,
  CspGlobalDhcpConfig,
} from '@/domain/dto/csp/zod/global-dhcp-config.zod';

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
    @Inject(DefaultEncodingSanitizerService)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  async importGlobalDhcpConfig(
    opts?: InterruptibleImportOptions,
  ): Promise<DhcpGlobalConfig | null> {
    const checkCancel = () => {
      if (opts?.isCancelled?.()) throw new Error('Import cancelled by user');
    };

    checkCancel();

    const raw = await this.cspDataClient.fetchGlobalDhcpConfig();
    const globalCfg: CspGlobalDhcpConfig | null = raw
      ? CspGlobalDhcpConfigSchema.parse(raw)
      : null;

    const isEmpty =
      !globalCfg ||
      (globalCfg.dhcp_options.length === 0 &&
        (!globalCfg.comment || globalCfg.comment === ''));

    if (isEmpty) {
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

    // Normalisieren + deduplizieren
    const normalisedDhcpOptions = normalizeAndDedupeDhcpOptions(
      globalCfg.dhcp_options,
    );
    const realOptions = normalisedDhcpOptions.filter(
      (opt) => opt.type !== 'group',
    );

    const total =
      realOptions.length +
      (Array.isArray(normalisedDhcpOptions) ? normalisedDhcpOptions.length : 0);
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    const sanitizedComment = this.encodingSanitizer.sanitize(
      globalCfg.comment ?? '',
    );

    checkCancel();
    const globalConfig = this.globalConfigRepo.create({
      comment: sanitizedComment,
    });
    await this.globalConfigRepo.save(globalConfig);

    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );

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

    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of await this.optionGroupRepo.find()) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

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

    return this.globalConfigRepo.findOneOrFail({
      where: { id: globalConfig.id },
      relations: ['dhcpOptions', 'optionGroups', 'optionGroups.optionGroup'],
    });
  }
}
