import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { OptionGroupMetaDto } from '@/domain/dto/csp/option-group-meta.dto';
import { DhcpOptionRaw } from './types/dhcp-option-raw.type';

/**
 * Creates a stack entry for a DHCP option (single or group).
 * Used by OptionStackAssembler per level and option code.
 */
@Injectable()
export class OptionInheritanceStackEntryFactory {
  toStackEntry(
    level: ObjectType,
    levelId: number,
    opt: DhcpOptionRaw,
    isExplicit: boolean,
    isInherited: boolean,
    isOverridden: boolean,
    optionGroup: OptionGroupMetaDto | null,
    comment: string | null,
    name?: string | null,
  ): OptionInheritanceStackEntryDto {
    return {
      level, // object type (e.g. SUBNET)
      levelId, // object id (e.g. subnetId)
      value: opt.option_value ?? null, // option value
      isExplicit, // set explicitly on this level
      isInherited, // inherited from a parent
      isOverridden, // overridden by a deeper value
      overriddenBy: undefined, // assigned later in the assembler
      optionGroup, // group metadata if part of a group
      comment: comment ?? opt.comment ?? null, // option or custom comment
      createdAt: opt.createdAt ?? null, // creation timestamp
      updatedAt: opt.updatedAt ?? null, // update timestamp
      name: name ?? opt.name ?? null, // option name (e.g. "domain-name-servers")
      type: opt.type ?? null, // option type (e.g. "address4", "fqdn")
      array: typeof opt.array === 'boolean' ? opt.array : null, // array flag
      optionCodeComment: opt.optionCodeComment ?? null, // comment on the option code
      optionCodeSource: opt.optionCodeSource ?? null, // source (e.g. "dhcp_server", "customer")
      optionSpace: opt.optionSpace ?? null, // option space metadata
    };
  }
}
