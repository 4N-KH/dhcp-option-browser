import { Injectable, Logger } from '@nestjs/common';
import { OptionInheritanceStackEntryFactory } from '@/application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from '@/application/services/option-hierarchy/csp/option-group-meta.factory';
import { StackBuilderService } from './stack-builder.service';
import { SlimDtoFactoryService } from './slim-dto-factory.service';
import { EffectiveDhcpOptionSlimDto } from '@/domain/dto/csp/effective-dhcp-option-slim.dto';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import type { ContextObj } from '../types/context-obj.type';
import type { ContextTreeMaps } from '../types/context-tree-maps.type';

// Importiere das neue Utility:
import { markRedundancyPerPanelStrict } from '@/shared/utils/mark-redundancy-per-panel.util';

@Injectable()
export class OptionStackAssemblerService {
  private readonly logger = new Logger(OptionStackAssemblerService.name);

  constructor(
    private readonly stackEntryFactory: OptionInheritanceStackEntryFactory,
    private readonly optionGroupMetaFactory: OptionGroupMetaFactory,
    private readonly stackBuilder: StackBuilderService,
    private readonly slimDtoFactory: SlimDtoFactoryService,
  ) {}

  assemble(contexts: ContextObj[]): {
    stacks: Map<string, OptionInheritanceStackEntryDto[]>;
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >;
  } {
    // Nur Stack-Building, kein Redundanz-Marking mehr hier!
    const { stacks, allGroups } = this.stackBuilder.build(contexts);
    return { stacks, allGroups };
  }

  buildSlimDtoForAll(
    stacks: Map<string, OptionInheritanceStackEntryDto[]>,
    contexts: ContextObj[],
    allGroups: Map<
      number,
      { group: OptionGroup; ctxIdx: number; ctx: ContextObj }
    >,
    contextTreeMaps?: ContextTreeMaps,
  ): EffectiveDhcpOptionSlimDto[] {
    const result = this.slimDtoFactory.buildSlimDtoForAll(
      stacks,
      contexts,
      allGroups,
      contextTreeMaps,
    );
    // Panel-Redundanzen markieren (funktioniert für Einzeloptionen UND Gruppen)
    markRedundancyPerPanelStrict(result);
    return result;
  }
}
