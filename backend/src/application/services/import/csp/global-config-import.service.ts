import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from '@/infrastructure/database/csp/global-config-option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

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
  ) {}

  async importGlobalDhcpConfig(): Promise<DhcpGlobalConfig> {
    this.logger.log('Importing global DHCPv4 configuration from CSP...');
    const rawGlobalConfig = await this.cspDataClient.fetchGlobalDhcpConfig();

    this.logger.verbose(`Received from CSP: ${JSON.stringify(rawGlobalConfig, null, 2)}`);

    // Fehler nur wenn komplett kein Objekt geliefert wird
    if (!rawGlobalConfig || typeof rawGlobalConfig !== 'object') {
      this.logger.error(
        'Global DHCP Config konnte nicht geladen werden – keine gültigen Daten empfangen.',
      );
      throw new Error(
        'Global DHCP Config konnte nicht geladen werden – keine gültigen Daten empfangen.',
      );
    }

    // Logging der Struktur und "Edge Cases"
    if (!('dhcp_options' in rawGlobalConfig)) {
      this.logger.warn(
        'Achtung: Feld "dhcp_options" fehlt komplett im CSP-Objekt – wird als [] behandelt!',
      );
    }
    if (
      !rawGlobalConfig.dhcp_options ||
      !Array.isArray(rawGlobalConfig.dhcp_options)
    ) {
      this.logger.log(
        `Feld "dhcp_options" ist ${typeof rawGlobalConfig.dhcp_options} – setze als leeres Array.`,
      );
    } else if (rawGlobalConfig.dhcp_options.length === 0) {
      this.logger.log(
        'Feld "dhcp_options" ist leer – keine globalen Optionen gesetzt.',
      );
    } else {
      this.logger.log(
        `Feld "dhcp_options" mit ${rawGlobalConfig.dhcp_options.length} Einträgen empfangen.`,
      );
    }

    if ('comment' in rawGlobalConfig) {
      this.logger.log(`GlobalConfig-Comment: "${rawGlobalConfig.comment}"`);
    }

    // FK-sichere Löschung: Vorherige zentrale Konfig + Relations entfernen
    const existing = await this.globalConfigRepo.findOne({
      relations: ['dhcpOptions', 'optionGroups'],
      where: {}, // Falls du mehrere configs haben solltest, hier ggf. auf eindeutige Criteria einschränken
    });
    if (existing) {
      this.logger.log(
        'Vorherige zentrale Konfiguration gefunden – wird gelöscht.',
      );
      await this.globalConfigOptionRepo.delete({ globalConfigId: existing.id });
      await this.globalConfigOptionGroupRepo.delete({
        globalConfigId: existing.id,
      });
      await this.globalConfigRepo.delete(existing.id);
    } else {
      this.logger.log('Keine vorherige zentrale Konfiguration vorhanden.');
    }

    // Optionen normalisieren (leere Arrays werden korrekt akzeptiert)
    const normalizedDhcpOptions = normalizeDhcpOptions(
      Array.isArray(rawGlobalConfig.dhcp_options)
        ? rawGlobalConfig.dhcp_options
        : [],
    );
    this.logger.log(
      `Normalisierte Optionen: ${normalizedDhcpOptions.length} (werden gleich gespeichert)`,
    );

    // OptionGroups extrahieren (nur, wenn Gruppen vorkommen)
    const groupNames = new Set<string>();
    for (const opt of normalizedDhcpOptions) {
      if (
        opt.group &&
        typeof opt.group === 'string' &&
        opt.group.trim() !== ''
      ) {
        groupNames.add(opt.group);
      }
    }
    if (groupNames.size > 0) {
      this.logger.log(
        `Gefundene Gruppen in Optionen: ${Array.from(groupNames).join(', ')}`,
      );
    } else {
      this.logger.log('Keine OptionGroups in Optionen gefunden.');
    }

    // OptionGroup-Mapping (Name und/oder externalId)
    const allOptionGroups = await this.optionGroupRepo.find();
    const groupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (og.name) groupMap.set(og.name, og);
      if (og.externalId) groupMap.set(og.externalId, og);
    }
    this.logger.debug(
      `Loaded ${allOptionGroups.length} OptionGroups aus DB für Mapping.`,
    );

    // Neue globale Konfiguration (egal ob Optionen vorhanden oder nicht)
    const globalConfig = this.globalConfigRepo.create({
      comment: rawGlobalConfig?.comment ?? null,
    });
    await this.globalConfigRepo.save(globalConfig);
    this.logger.log(
      `Neue zentrale Konfiguration in DB erzeugt (id=${globalConfig.id}).`,
    );

    // OptionCodes map
    const allOptionCodes = await this.optionCodeRepo.find();
    const codeMap = new Map<string, OptionCodeEntity>();
    for (const oc of allOptionCodes) codeMap.set(String(oc.code), oc);

    // Einzeloptionen anlegen (ggf. keine!)
    let savedOptions = 0;
    for (const opt of normalizedDhcpOptions) {
      const optionCodeEntity = codeMap.get(String(opt.option_code));
      const optEntity = this.globalConfigOptionRepo.create({
        globalConfig,
        globalConfigId: globalConfig.id,
        group: opt.group ?? null,
        option_code: opt.option_code,
        option_value: opt.option_value,
        type: opt.type,
        optionCode: optionCodeEntity ?? null,
        optionCodeId: optionCodeEntity?.id ?? null,
      });
      await this.globalConfigOptionRepo.save(optEntity);
      savedOptions++;
    }
    this.logger.log(
      `${savedOptions} Optionen für zentrale Konfiguration gespeichert.`,
    );

    // OptionGroups zuordnen (kann auch 0 sein)
    let savedGroups = 0;
    for (const groupName of groupNames) {
      const optionGroup = groupMap.get(groupName);
      if (optionGroup) {
        const gcog = this.globalConfigOptionGroupRepo.create({
          globalConfig,
          globalConfigId: globalConfig.id,
          optionGroup,
          optionGroupId: optionGroup.id,
        });
        await this.globalConfigOptionGroupRepo.save(gcog);
        savedGroups++;
      } else {
        this.logger.warn(
          `OptionGroup "${groupName}" aus globaler Konfiguration nicht in DB gefunden.`,
        );
      }
    }
    this.logger.log(
      `${savedGroups} OptionGroups für zentrale Konfiguration gespeichert.`,
    );

    // Mit allen Relationen neu laden (liefert immer EINE zentrale Konfiguration)
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
