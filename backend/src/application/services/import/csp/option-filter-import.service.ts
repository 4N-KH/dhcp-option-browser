import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionFilter } from '@/infrastructure/database/csp/option-filter.entity';
import { CspOptionFilterDto } from '@/domain/dto/csp/option-filter.dto';

@Injectable()
export class CspOptionFilterImportService {
  private readonly logger = new Logger(CspOptionFilterImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionFilter)
    private readonly optionFilterRepo: Repository<OptionFilter>,
  ) {}

  async importOptionFilters(): Promise<OptionFilter[]> {
    this.logger.log('Starte Import der Option Filter von CSP...');

    // Schritt 1: Rohdaten abrufen
    const rawFilters = await this.cspDataClient.fetchOptionFilters();

    if (!rawFilters?.length) {
      this.logger.warn('Keine Option Filter von der CSP-API erhalten.');
      return [];
    }

    this.logger.log(
      `[Import] CSP-API lieferte ${rawFilters.length} Option Filter.`,
    );

    const imported: OptionFilter[] = [];
    const skipped: { id: string; name: string; reason: string }[] = [];
    const allReceivedIds: string[] = (rawFilters as CspOptionFilterDto[]).map(
      (f) => f.id,
    );
    const persistedIds: string[] = [];

    for (const dto of rawFilters as CspOptionFilterDto[]) {
      // Grundvalidierung
      if (!dto.id || !dto.name) {
        skipped.push({
          id: dto.id || 'UNDEFINED',
          name: dto.name || '',
          reason: 'Fehlende ID oder Name',
        });
        continue;
      }

      // Mapping zu Entity
      let entity = await this.optionFilterRepo.findOne({
        where: { externalId: dto.id },
      });

      if (!entity) {
        entity = this.optionFilterRepo.create({ externalId: dto.id });
      }

      entity.name = dto.name;
      entity.protocol = dto.protocol ?? undefined;
      entity.role = dto.role ?? undefined;
      entity.comment = dto.comment ?? undefined;
      entity.vendorSpecificOptionOptionSpace =
        dto.vendor_specific_option_option_space ?? undefined;
      entity.createdAt = dto.created_at ?? undefined;
      entity.updatedAt = dto.updated_at ?? undefined;

      // dhcp_options (korrektes Mapping/Validierung)
      if (Array.isArray(dto.dhcp_options)) {
        entity.dhcpOptions = dto.dhcp_options.filter(
          (opt) =>
            (opt.type === 'option' &&
              typeof opt.option_code === 'string' &&
              typeof opt.option_value === 'string') ||
            (opt.type === 'group' && typeof opt.group === 'string'),
        );
      } else {
        entity.dhcpOptions = undefined;
      }

      // rules (optional, garantiert string für match)
      if (dto.rules && typeof dto.rules === 'object') {
        entity.rules = {
          match: typeof dto.rules.match === 'string' ? dto.rules.match : '',
          rules: Array.isArray(dto.rules.rules)
            ? dto.rules.rules.map((r) => ({
                compare: r.compare,
                option_code: r.option_code,
                option_value: r.option_value,
                substring_offset: r.substring_offset ?? undefined,
              }))
            : [],
        };
      } else {
        entity.rules = undefined;
      }

      // Persistieren
      await this.optionFilterRepo.save(entity);
      imported.push(entity);
      persistedIds.push(dto.id);

      this.logger.debug(
        `[${dto.id}] Persistiert: name="${dto.name}", dhcpOptions: ${JSON.stringify(entity.dhcpOptions)}`,
      );
    }

    // Logging: Skipped und fehlende IDs
    if (skipped.length) {
      this.logger.warn(
        `[Import] ${skipped.length} Filter wurden übersprungen:`,
      );
      skipped.forEach((f) =>
        this.logger.warn(`Skipped: "${f.name}" (${f.id}) - Grund: ${f.reason}`),
      );
    }

    const missingIds = allReceivedIds.filter(
      (id) => !persistedIds.includes(id),
    );
    if (missingIds.length > 0) {
      this.logger.warn(
        `[Import] ${missingIds.length} empfangene Option Filter NICHT persistiert! Fehlende IDs: ${JSON.stringify(missingIds)}`,
      );
    }

    this.logger.log(
      `Import abgeschlossen: ${imported.length} Option Filter gespeichert.`,
    );
    return imported;
  }
}
