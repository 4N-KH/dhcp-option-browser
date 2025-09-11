import { Injectable } from '@nestjs/common';
import { AllDhcpOptionAssignmentRepository } from '@/infrastructure/database/csp/all-dhcp-option-assignment.repository';
import { OptionOccurrenceDto } from '@/domain/dto/csp/option-occurrence.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

// Hilfsfunktion zum Mapping
function mapObjectType(type: string): ObjectType {
  switch (type) {
    case 'global':
      return ObjectType.GLOBAL;
    case 'ip_space':
      return ObjectType.IPSPACE;
    case 'address_block':
      return ObjectType.ADDRESSBLOCK;
    case 'subnet':
      return ObjectType.SUBNET;
    case 'range':
      return ObjectType.RANGE;
    case 'fixed_address':
      return ObjectType.FIXEDADDRESS;
    default:
      throw new Error(`Unknown object_type: ${type}`);
  }
}

@Injectable()
export class OptionValueEffectivenessService {
  constructor(private readonly viewRepo: AllDhcpOptionAssignmentRepository) {}

  async findObjectsWithEffectiveOptionValueKey(
    code: number,
    name: string,
    value: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const rows = await this.viewRepo.findOccurrencesForOptionValue(
      String(code),
      name,
      value,
      type,
      source,
    );
    return rows.map((row) => ({
      objectType: mapObjectType(row.object_type),
      objectId: row.object_id,
      objectLabel: row.object_label,
      objectDisplay: row.object_display,
      address: row.address,
      cidr: row.cidr,
      ipSpace: row.ip_space,
      value: row.option_value,
      setStatus: 'explicit',
      type: row.option_type,
      source: row.option_source,
      optionSpaceId: row.optionSpaceId,
      optionCodeId: row.optionCodeId,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }
}
