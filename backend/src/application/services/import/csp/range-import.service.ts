// backend/src/application/services/import/csp/range-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { RangeDhcpOption } from '@/infrastructure/database/csp/range-dhcp-option.entity';
import { RangeExclusion } from '@/infrastructure/database/csp/range-exclusion.entity';
import { RangeOptionGroup } from '@/infrastructure/database/csp/range-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

@Injectable()
export class CspRangeImportService {
  private readonly logger = new Logger(CspRangeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(RangeDhcpOption)
    private readonly dhcpOptionRepo: Repository<RangeDhcpOption>,
    @InjectRepository(RangeExclusion)
    private readonly exclusionRepo: Repository<RangeExclusion>,
    @InjectRepository(RangeOptionGroup)
    private readonly rangeOptionGroupRepo: Repository<RangeOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
  ) {}

  /**
   * Importiert alle Ranges aus CSP inkl. OptionGroups und persistiert sie in der Datenbank.
   */
  async importRanges(): Promise<Range[]> {
    this.logger.log('Importing Ranges from CSP...');
    const dtos = await this.cspDataClient.fetchRanges();

    if (!dtos?.length) {
      this.logger.warn('No Ranges found in CSP.');
      return [];
    }

    // Hole alle Subnets für Parent-Zuordnung
    const subnets = await this.subnetRepo.find();
    const subnetMap = new Map<string, Subnet>();
    for (const s of subnets) {
      if (s.externalId) subnetMap.set(s.externalId, s);
    }

    // Hole alle OptionGroups einmalig und mappe sie auf ihren Namen
    const allOptionGroups = await this.optionGroupRepo.find();
    const optionGroupByName = new Map<string, OptionGroup>();
    for (const group of allOptionGroups) {
      if (group.name) optionGroupByName.set(group.name, group);
    }

    const importedRanges: Range[] = [];

    for (const dto of dtos) {
      // Parent-Zuordnung (subnetId)
      const parentSubnet = dto.parent ? subnetMap.get(dto.parent) : undefined;
      if (!parentSubnet) {
        this.logger.warn(
          `No parent subnet found for Range ${dto.id} (parent: ${dto.parent}). Skipping.`,
        );
        continue; // Parent muss da sein
      }

      let range = await this.rangeRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'exclusionRanges', 'optionGroups'],
      });
      if (!range) {
        range = this.rangeRepo.create({ externalId: dto.id });
      }

      range.name = dto.name;
      range.start = dto.start;
      range.end = dto.end;
      range.comment = dto.comment ?? null;
      range.subnet = parentSubnet;
      range.subnetId = parentSubnet.id;
      // Defensive: inheritance_sources niemals als null speichern!
      range.inheritance_sources = dto.inheritance_sources ?? undefined;

      await this.rangeRepo.save(range);

      // DHCP-Optionen (neu anlegen, alte ggf. löschen)
      if (Array.isArray(range.dhcpOptions)) {
        await this.dhcpOptionRepo.delete({ rangeId: range.id });
      }
      if (Array.isArray(dto.dhcp_options) && dto.dhcp_options.length > 0) {
        for (const opt of dto.dhcp_options) {
          if (
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string'
          ) {
            const option = this.dhcpOptionRepo.create({
              range,
              rangeId: range.id,
              group: typeof opt.group === 'string' ? opt.group : null,
              option_code: opt.option_code,
              option_value: opt.option_value,
              type: opt.type,
            });
            await this.dhcpOptionRepo.save(option);
          }
        }
      }

      // OptionGroups (aus DHCP-Optionen herauslesen: alle unterschiedlichen group-Namen)
      // Zuerst alle zugehörigen Gruppenverknüpfungen entfernen
      await this.rangeOptionGroupRepo.delete({ rangeId: range.id });

      // Gruppennamen aus dhcp_options extrahieren und eindeutige Namen bilden
      const groupNames = Array.isArray(dto.dhcp_options)
        ? Array.from(
            new Set(
              dto.dhcp_options
                .map((o) => o.group)
                .filter((g): g is string => !!g && typeof g === 'string'),
            ),
          )
        : [];

      // Jede OptionGroup anhand Namen zuordnen (du könntest auch nach externalId mappen, wenn vorhanden)
      for (const groupName of groupNames) {
        const optionGroup = optionGroupByName.get(groupName);
        if (optionGroup) {
          const rog = this.rangeOptionGroupRepo.create({
            range,
            rangeId: range.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          });
          await this.rangeOptionGroupRepo.save(rog);
        } else {
          this.logger.warn(
            `OptionGroup "${groupName}" not found in DB for Range "${dto.id}". Skipping group link.`,
          );
        }
      }

      // Exclusion Ranges (neu anlegen, alte ggf. löschen)
      if (Array.isArray(range.exclusionRanges)) {
        await this.exclusionRepo.delete({ rangeId: range.id });
      }
      if (
        Array.isArray(dto.exclusion_ranges) &&
        dto.exclusion_ranges.length > 0
      ) {
        for (const excl of dto.exclusion_ranges) {
          if (excl.start && excl.end) {
            const exclusion = this.exclusionRepo.create({
              range,
              rangeId: range.id,
              start: excl.start,
              end: excl.end,
              comment: excl.comment ?? null,
            });
            await this.exclusionRepo.save(exclusion);
          }
        }
      }

      importedRanges.push(range);
    }

    this.logger.log(`Import complete: ${importedRanges.length} Ranges saved.`);
    return importedRanges;
  }
}
