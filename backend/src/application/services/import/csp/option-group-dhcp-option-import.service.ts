import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionGroupDhcpOption } from '@/infrastructure/database/csp/option-group-dhcp-option.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspOptionGroupDhcpOptionImportService {
  private readonly logger = new Logger(
    CspOptionGroupDhcpOptionImportService.name,
  );

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionGroupDhcpOption)
    private readonly ogdoRepo: Repository<OptionGroupDhcpOption>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    private readonly encodingSanitizer: DefaultEncodingSanitizerService,
  ) {}

  async importOptionGroupDhcpOptions(
    opts?: InterruptibleImportOptions,
  ): Promise<void> {
    this.logger.log(
      'Starting import of OptionGroupDhcpOption mappings from CSP...',
    );

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('OptionGroupDhcpOption import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const groups = await this.cspDataClient.fetchOptionGroups();
    const allCodes = await this.optionCodeRepo.find({
      relations: ['optionSpace'],
    });

    const codeMap = new Map<string, OptionCodeEntity>(
      allCodes.map((code) => [code.externalId, code]),
    );

    const total = groups.reduce(
      (acc, group) => acc + (group.dhcp_options?.length || 0),
      0,
    );
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    let created = 0;
    let skipped = 0;

    for (const group of groups) {
      checkCancel();

      if (!group.dhcp_options?.length) continue;

      const groupEntity = await this.optionGroupRepo.findOne({
        where: { externalId: group.id },
      });
      if (!groupEntity) {
        this.logger.warn(
          `OptionGroup with externalId=${group.id} not found in DB – skipping.`,
        );
        progress += group.dhcp_options.length;
        report();
        continue;
      }

      for (const opt of group.dhcp_options) {
        checkCancel();

        const codeEntity = codeMap.get(opt.option_code);
        const optionSpaceRef = codeEntity?.optionSpace ?? undefined;
        const optionSpaceId = optionSpaceRef?.id ?? undefined;

        if (!codeEntity) {
          this.logger.warn(
            `OptionCode with externalId=${opt.option_code} not found – skipping.`,
          );
          skipped++;
          progress++;
          report();
          continue;
        }

        const sanitizedValue = this.encodingSanitizer.sanitize(
          opt.option_value,
        );

        const exists = await this.ogdoRepo.findOne({
          where: {
            optionGroupId: groupEntity.id,
            optionCodeId: codeEntity.id,
            option_value: sanitizedValue,
          },
        });

        if (!exists) {
          const entity = this.ogdoRepo.create({
            optionGroup: groupEntity,
            optionGroupId: groupEntity.id,
            optionCode: codeEntity,
            optionCodeId: codeEntity.id,
            option_value: sanitizedValue,
            optionSpace: optionSpaceRef,
            optionSpaceId,
          });
          await this.ogdoRepo.save(entity);
          created++;
        }

        progress++;
        report();
      }
    }

    this.logger.log(
      `Import complete: ${created} new OptionGroupDhcpOption mappings created, ${skipped} skipped.`,
    );
  }
}
