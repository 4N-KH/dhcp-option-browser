// src/application/services/option-hierarchy/csp/option-inheritance-stack-entry.factory.ts
import { Injectable } from '@nestjs/common';
import { OptionInheritanceStackEntryDto } from '@/domain/dto/csp/effective-dhcp-option-stack.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { OptionGroupMetaDto } from '@/domain/dto/csp/option-group-meta.dto';
import { DhcpOptionRaw } from './types/dhcp-option-raw.type';

/**
 * Stellt einen Stack-Eintrag für eine Option (Einzel- oder Gruppenoption) bereit.
 * Wird vom OptionStackAssembler pro Ebene und Code verwendet.
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
      level, // Ebene (Objekttyp, z.B. SUBNET)
      levelId, // Ebene (ID, z.B. subnetId)
      value: opt.option_value ?? null, // Wert (immer String, ggf. kommasepariert)
      isExplicit, // explizit gesetzt auf dieser Ebene
      isInherited, // von Parent geerbt
      isOverridden, // wurde durch tieferen Wert überschrieben
      overriddenBy: undefined, // Wird im Assembler gesetzt!
      optionGroup, // Metadaten, falls Teil einer Gruppe (sonst null)
      comment: comment ?? opt.comment ?? null, // Kommentar (auf Option selbst oder als Argument)
      createdAt: opt.createdAt ?? null, // Erstellungsdatum OptionCode/Objekt
      updatedAt: opt.updatedAt ?? null, // Änderungsdatum OptionCode/Objekt
      name: name ?? opt.name ?? null, // Klarname der Option (z.B. "domain-name-servers")
      type: opt.type ?? null, // Optionentyp (z.B. "address4", "fqdn", "uint32")
      array: typeof opt.array === 'boolean' ? opt.array : null, // Array-Markierung
      optionCodeComment: opt.optionCodeComment ?? null, // Kommentar am OptionCode
      optionCodeSource: opt.optionCodeSource ?? null, // Quelle (z.B. "dhcp_server", "customer")
      optionSpace: opt.optionSpace ?? null, // OptionSpace-Metadaten (id, name, protocol)
    };
  }
}
