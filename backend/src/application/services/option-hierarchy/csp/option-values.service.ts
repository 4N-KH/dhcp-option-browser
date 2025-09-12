import { Injectable } from '@nestjs/common';
import { AllDhcpOptionAssignmentRepository } from '@/infrastructure/database/csp/all-dhcp-option-assignment.repository';
import { OptionValueOverviewDto } from '@/domain/dto/csp/option-value-overview.dto';

@Injectable()
export class OptionValuesService {
  constructor(private readonly viewRepo: AllDhcpOptionAssignmentRepository) {}

  /**
   * Liefert alle Werte (option_value) und deren Anzahl von Objekten,
   * auf denen dieser Wert effektiv gesetzt ist, für einen gegebenen Option-Code+Name(+Type,+Source).
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
    // Explizit: nur Werte mit mind. 1 Objekt (objectCount > 0)
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
