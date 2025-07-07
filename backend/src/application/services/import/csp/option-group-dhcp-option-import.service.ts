// backend/src/application/services/import/csp/option-group-dhcp-option-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionGroupDhcpOption } from '@/infrastructure/database/csp/option-group-dhcp-option.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';

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
  ) {}

  async importOptionGroupDhcpOptions(): Promise<void> {
    this.logger.log('Importiere OptionGroupDhcpOption-Zuordnungen aus CSP...');

    const groups = await this.cspDataClient.fetchOptionGroups();
    const allCodes = await this.optionCodeRepo.find({
      relations: ['optionSpace'],
    });
    const codeMap = new Map<string, OptionCodeEntity>(
      allCodes.map((code) => [code.externalId, code]),
    );

    let created = 0,
      skipped = 0;
    for (const group of groups) {
      if (!group.dhcp_options?.length) continue;

      const groupEntity = await this.optionGroupRepo.findOne({
        where: { externalId: group.id },
      });
      if (!groupEntity) {
        this.logger.warn(
          `OptionGroup mit externalId=${group.id} nicht in DB gefunden – überspringe.`,
        );
        continue;
      }

      for (const opt of group.dhcp_options) {
        const codeEntity = codeMap.get(opt.option_code);
        const optionSpaceRef = codeEntity?.optionSpace ?? undefined;
        const optionSpaceId = optionSpaceRef?.id ?? undefined;

        if (!codeEntity) {
          this.logger.warn(
            `OptionCode mit externalId=${opt.option_code} nicht gefunden – überspringe.`,
          );
          skipped++;
          continue;
        }

        // Eindeutig prüfen NUR über optionGroupId, optionCodeId und option_value
        const exists = await this.ogdoRepo.findOne({
          where: {
            optionGroupId: groupEntity.id,
            optionCodeId: codeEntity.id,
            option_value: opt.option_value,
          },
        });

        if (!exists) {
          const entity = this.ogdoRepo.create({
            optionGroup: groupEntity,
            optionGroupId: groupEntity.id,
            optionCode: codeEntity,
            optionCodeId: codeEntity.id,
            option_value: opt.option_value,
            optionSpace: optionSpaceRef,
            optionSpaceId: optionSpaceId,
          });
          await this.ogdoRepo.save(entity);
          created++;
        }
      }
    }

    this.logger.log(
      `Fertig: ${created} neue OptionGroupDhcpOption-Zuordnungen angelegt, ${skipped} übersprungen.`,
    );
  }
}
