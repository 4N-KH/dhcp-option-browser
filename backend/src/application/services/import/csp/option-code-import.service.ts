import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';

/**
 * Baut eine Map aller OptionCodes, schlüsselt nach externalId und code (beides String).
 * Diese Hilfsfunktion kannst du für andere Import-Services mitverwenden!
 */
export function buildOptionCodeMap(
  optionCodes: OptionCodeEntity[],
): Map<string, OptionCodeEntity> {
  const map = new Map<string, OptionCodeEntity>();
  for (const code of optionCodes) {
    if (code.externalId) map.set(code.externalId, code);
    if (code.code !== undefined && code.code !== null)
      map.set(String(code.code), code);
  }
  return map;
}

@Injectable()
export class CspOptionCodeImportService {
  private readonly logger = new Logger(CspOptionCodeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
  ) {}

  /**
   * Importiert alle OptionCodes inkl. OptionSpace-Mapping (über externalId UND name!).
   */
  async importOptionCodes(): Promise<OptionCodeEntity[]> {
    this.logger.log('Commencing import of DHCP Option Codes from CSP...');
    const codes = await this.cspDataClient.fetchOptionCodes();

    if (!codes?.length) {
      this.logger.warn('No Option Codes were received from CSP.');
      return [];
    }

    // OptionSpaces laden und Map bauen (nach externalId UND name, unique!)
    const optionSpaces = await this.optionSpaceRepo.find();
    const optionSpaceMap = new Map<string, OptionSpace>();
    for (const os of optionSpaces) {
      if (os.externalId) optionSpaceMap.set(os.externalId, os);
      if (os.name) optionSpaceMap.set(os.name, os);
    }

    const importedEntities: OptionCodeEntity[] = [];
    for (const dto of codes) {
      // Versuche zuerst nach externalId, dann nach Name
      let optionSpace: OptionSpace | undefined = undefined;
      if (dto.option_space && optionSpaceMap.has(dto.option_space)) {
        optionSpace = optionSpaceMap.get(dto.option_space);
      }

      // Upsert nach externalId
      let entity = await this.optionCodeRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionCodeRepo.create({ externalId: dto.id });
      }

      entity.code = String(dto.code); // Immer string, egal was geliefert wird!
      entity.name = typeof dto.name === 'string' ? dto.name : '';
      entity.type = typeof dto.type === 'string' ? dto.type : null;
      entity.optionSpace = optionSpace;
      entity.optionSpaceId = optionSpace?.id ?? null;
      entity.comment = typeof dto.comment === 'string' ? dto.comment : null;
      entity.source = typeof dto.source === 'string' ? dto.source : null;
      entity.array = typeof dto.array === 'boolean' ? dto.array : null;
      entity.createdAt =
        typeof dto.created_at === 'string' ? dto.created_at : null;
      entity.updatedAt =
        typeof dto.updated_at === 'string' ? dto.updated_at : null;

      await this.optionCodeRepo.save(entity);
      importedEntities.push(entity);
    }
    this.logger.log(
      `Import complete: ${importedEntities.length} Option Codes have been saved.`,
    );
    return importedEntities;
  }
}
