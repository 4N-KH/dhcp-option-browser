import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { OptionSpace } from '@/infrastructure/database/csp/option-space.entity';
import { EncodingSanitizer } from '../transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from '../transformers/default-encoding-sanitizer.service';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspOptionCodeImportService {
  private readonly logger = new Logger(CspOptionCodeImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @InjectRepository(OptionSpace)
    private readonly optionSpaceRepo: Repository<OptionSpace>,
    @Inject(DefaultEncodingSanitizerService)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  /*
  Imports all OptionCodes and links them to OptionSpaces (by externalId or name).
  Supports cancellation and progress tracking.
   */
  async importOptionCodes(
    opts?: InterruptibleImportOptions,
  ): Promise<OptionCodeEntity[]> {
    this.logger.log('Commencing import of DHCP Option Codes from CSP...');

    // Abort if cancelled mid-process
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('OptionCode import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const codes = await this.cspDataClient.fetchOptionCodes();

    if (!codes?.length) {
      this.logger.warn('No Option Codes were received from CSP.');
      return [];
    }

    // Preload OptionSpaces and build a lookup by both externalId and name
    const optionSpaces = await this.optionSpaceRepo.find();
    const optionSpaceMap = new Map<string, OptionSpace>();
    for (const os of optionSpaces) {
      if (os.externalId) optionSpaceMap.set(os.externalId, os);
      if (os.name) optionSpaceMap.set(os.name, os);
    }

    const importedEntities: OptionCodeEntity[] = [];
    const total = codes.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of codes) {
      checkCancel();

      // Resolve OptionSpace by externalId or name
      let optionSpace: OptionSpace | undefined = undefined;
      if (dto.option_space && optionSpaceMap.has(dto.option_space)) {
        optionSpace = optionSpaceMap.get(dto.option_space);
      }

      // Upsert OptionCode by externalId
      let entity = await this.optionCodeRepo.findOne({
        where: { externalId: dto.id },
      });
      if (!entity) {
        entity = this.optionCodeRepo.create({ externalId: dto.id });
      }

      // Normalize and sanitize all fields
      entity.code = String(dto.code); // Always stored as string
      entity.name = this.encodingSanitizer.sanitize(
        typeof dto.name === 'string' ? dto.name : '',
      );
      entity.type = this.encodingSanitizer.sanitize(
        typeof dto.type === 'string' ? dto.type : null,
      );
      entity.optionSpace = optionSpace;
      entity.optionSpaceId = optionSpace?.id ?? null;
      entity.comment = this.encodingSanitizer.sanitize(
        typeof dto.comment === 'string' ? dto.comment : null,
      );
      entity.source = this.encodingSanitizer.sanitize(
        typeof dto.source === 'string' ? dto.source : null,
      );
      entity.array = typeof dto.array === 'boolean' ? dto.array : null;
      entity.createdAt =
        typeof dto.created_at === 'string'
          ? this.encodingSanitizer.sanitize(dto.created_at)
          : null;
      entity.updatedAt =
        typeof dto.updated_at === 'string'
          ? this.encodingSanitizer.sanitize(dto.updated_at)
          : null;

      await this.optionCodeRepo.save(entity);
      importedEntities.push(entity);

      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${importedEntities.length} Option Codes have been saved.`,
    );
    return importedEntities;
  }
}
