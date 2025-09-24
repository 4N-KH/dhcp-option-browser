import { Injectable } from '@nestjs/common';
import { AllDhcpOptionAssignmentRepository } from '@/infrastructure/database/csp/all-dhcp-option-assignment.repository';
import { OptionValueOverviewDto } from '@/domain/dto/csp/option-value-overview.dto';

@Injectable()
export class OptionValuesService {
  constructor(private readonly viewRepo: AllDhcpOptionAssignmentRepository) {}

  /**
   * Returns all option_value entries and the number of objects
   * where each value is effectively set for a given option code + name (+ type, + source).
   */
  async getAllValuesForOptionKey(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionValueOverviewDto[]> {
    const result = await this.viewRepo.findValuesByOptionKey(
      String(code),
      name,
      type,
      source,
    );
    // result: Array<{ value: string; objectCount: number }>
    // Explicitly include only values with at least one object (objectCount > 0)
    return result
      .filter(
        ({ value, objectCount }) =>
          value != null && value !== '' && objectCount > 0,
      )
      .map(({ value, objectCount }) => ({
        value,
        count: objectCount,
      }));
  }
}
