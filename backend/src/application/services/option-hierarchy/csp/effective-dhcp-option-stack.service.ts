import { Injectable, Logger } from '@nestjs/common';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import {
  ContextChainBuilder,
  filterContextsForAddressBlock,
} from './context-chain.builder';
import { ExplicitOptionsLoader } from './types/explicit-options.loader';
import { OptionGroupsLoader } from './types/option-groups.loader';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionStackAssemblerService } from './types/option-stack-assembler/option-stack-assembler-orchestrator.service';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';

import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { AddressBlock } from '@/infrastructure/database/csp/address-block.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ContextObj } from './types/option-stack-assembler/types/context-obj.type';

// Redundanz & Dedupe-Utility:
import { markRedundancyPerPanelStrict } from '@/shared/utils/mark-redundancy-per-panel.util';
import { dedupeEffectiveDhcpOptionSlimDtoArray } from '@/shared/utils/dedupe-effective-options.util';

@Injectable()
export class EffectiveDhcpOptionStackService {
  private readonly logger = new Logger(EffectiveDhcpOptionStackService.name);

  constructor(
    private readonly contextChainBuilder: ContextChainBuilder,
    private readonly explicitOptionsLoader: ExplicitOptionsLoader,
    private readonly optionGroupsLoader: OptionGroupsLoader,
    private readonly optionStackAssembler: OptionStackAssemblerService,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(AddressBlock)
    private readonly addressBlockRepo: Repository<AddressBlock>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
  ) {}

  async getEffectiveOptionsForObject(
    objectType: ObjectType,
    objectId: number,
    enableDebugLogging = false,
  ): Promise<EffectiveDhcpOptionSlimDto[]> {
    if (enableDebugLogging) {
      this.logger.warn(
        `[DEBUG] getEffectiveOptionsForObject called for ${objectType} (ID: ${objectId})`,
      );
    }

    // 1. Kontext-Kette aufbauen
    const contextChain = await this.contextChainBuilder.build(
      objectType,
      objectId,
    );

    // 2. Explizite Optionen + OptionGroups laden
    const allContexts: ContextObj[] = [];
    for (const ctx of contextChain) {
      const options = await this.explicitOptionsLoader.load(
        ctx.level,
        ctx.levelId,
      );
      const optionGroups = await this.optionGroupsLoader.load(
        ctx.level,
        ctx.levelId,
      );
      allContexts.push({ ...ctx, options, optionGroups });
    }

    // 3. OptionGroups-Vererbung robust ergänzen (nie doppelt!)
    const allGroups = new Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >();
    for (let i = 0; i < allContexts.length; ++i) {
      for (const g of allContexts[i].optionGroups) {
        if (!allGroups.has(g.group.id)) {
          allGroups.set(g.group.id, {
            group: g.group,
            ctxIdx: i,
            ctx: allContexts[i],
          });
        }
      }
    }
    for (let i = 0; i < allContexts.length; ++i) {
      const ctx = allContexts[i];
      const explicitIds = new Set(ctx.optionGroups.map((g) => g.group.id));
      for (const [gid, gInfo] of allGroups.entries()) {
        if (gInfo.ctxIdx < i && !explicitIds.has(gid)) {
          ctx.optionGroups.push({
            group: gInfo.group,
            options: [],
          });
        }
      }
    }

    // 4. Label-Maps für Kontext-Labels bauen
    const [ipSpaces, addressBlocks, subnets, ranges, globalConfig] =
      await Promise.all([
        this.ipSpaceRepo.find(),
        this.addressBlockRepo.find(),
        this.subnetRepo.find(),
        this.rangeRepo.find(),
        this.globalConfigRepo.findOne({ where: {} }),
      ]);

    const contextTreeMaps = {
      globalConfigId: globalConfig?.id,
      ipSpacesById: new Map(ipSpaces.map((x) => [x.id, { name: x.name }])),
      addressBlocksById: new Map(
        addressBlocks.map((x) => [
          x.id,
          { name: x.name, address: x.address, cidr: x.cidr },
        ]),
      ),
      subnetsById: new Map(
        subnets.map((x) => [
          x.id,
          { name: x.name, address: x.address, cidr: x.cidr },
        ]),
      ),
      rangesById: new Map(
        ranges.map((x) => [x.id, { name: x.name, start: x.start, end: x.end }]),
      ),
    };

    // 5. Kontext ggf. auf AddressBlock filtern
    let filteredContexts = allContexts;
    if (objectType === ObjectType.ADDRESSBLOCK) {
      filteredContexts = filterContextsForAddressBlock(allContexts, objectId);
    }

    // 6. Stacks bauen und DTOs mappen
    const { stacks, allGroups: fullAllGroups } =
      this.optionStackAssembler.assemble(filteredContexts);

    // 7. Slim-DTOs fürs Frontend (noch ohne Redundanz)
    let slimDtos = this.optionStackAssembler.buildSlimDtoForAll(
      stacks,
      filteredContexts,
      fullAllGroups,
      contextTreeMaps,
    );

    // 8. Deduplizieren: Keine doppelten Optionen oder Gruppenoptionen pro Panel!
    slimDtos = dedupeEffectiveDhcpOptionSlimDtoArray(slimDtos);

    // 9. Jetzt Redundanz-Flags panel-weise markieren (NUR Panel-scharf, keine globale Duplikaterkennung!)
    markRedundancyPerPanelStrict(slimDtos);

    if (enableDebugLogging) {
      this.logger.warn(
        `[DEBUG] Final Slim DTOs (${slimDtos.length}):\n` +
          slimDtos
            .map((dto) => `  - ${dto.code} (${dto.name ?? ''})`)
            .join('\n'),
      );
    }

    return slimDtos;
  }
}
