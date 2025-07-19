import { Injectable, Logger } from '@nestjs/common';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { ContextChainBuilder } from './context-chain.builder';
import { ExplicitOptionsLoader } from './types/explicit-options.loader';
import { OptionGroupsLoader } from './types/option-groups.loader';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { DhcpOptionRaw } from './types/dhcp-option-raw.type';
import { OptionStackAssembler } from './types/option-stack.assembler';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';

type ContextObj = {
  level: ObjectType;
  levelId: number;
  options: DhcpOptionRaw[];
  optionGroups: { group: OptionGroup; options: DhcpOptionRaw[] }[];
};

@Injectable()
export class EffectiveDhcpOptionStackService {
  private readonly logger = new Logger(EffectiveDhcpOptionStackService.name);

  constructor(
    private readonly contextChainBuilder: ContextChainBuilder,
    private readonly explicitOptionsLoader: ExplicitOptionsLoader,
    private readonly optionGroupsLoader: OptionGroupsLoader,
    private readonly optionStackAssembler: OptionStackAssembler,
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

    // 1. ContextChain aufbauen
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

    // *** DEBUG: Ausführlicher Dump aller geladenen Kontexte ***
    if (enableDebugLogging) {
      this.logger.warn(
        '[DEBUG] Dump of allContexts (incl. OptionGroups and Options):\n' +
          JSON.stringify(
            allContexts.map((ctx) => ({
              level: ctx.level,
              levelId: ctx.levelId,
              options: ctx.options.map((o) => ({
                code: o.code,
                value: o.option_value,
                name: o.name,
              })),
              optionGroups: ctx.optionGroups.map((g) => ({
                group: g.group?.name ?? g.group?.id,
                groupId: g.group?.id,
                options: g.options.map((o) => ({
                  code: o.code,
                  value: o.option_value,
                  name: o.name,
                })),
              })),
            })),
            null,
            2,
          ),
      );
    }

    // 3. OptionGroups robust mit Vererbung (explizit, inherited, nie doppelt!)
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

    if (enableDebugLogging) {
      allContexts.forEach((ctx, idx) => {
        this.logger.warn(
          `[DEBUG] Context [${idx}] Level: ${ctx.level} (ID: ${ctx.levelId}) Options: ${ctx.options.length} OptionGroups: ${ctx.optionGroups.length}`,
        );
      });
    }

    // 4. Stacks bauen (inkl. OptionGroup-Inheritance) UND allGroups weitergeben!
    const { stacks, allGroups: fullAllGroups } =
      this.optionStackAssembler.assemble(allContexts);

    if (enableDebugLogging) {
      this.logger.warn(`[DEBUG] OptionStacks assembled, begin DTO mapping...`);
    }

    // 5. Slim-DTOs für das Frontend (alle drei Parameter übergeben!)
    const slimDtos = this.optionStackAssembler.buildSlimDtoForAll(
      stacks,
      allContexts,
      fullAllGroups,
    );

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
