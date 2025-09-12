import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';

export interface OptionCodeOverviewDto {
  code: number;
  name: string;
  type: string | null;
  source: string | null;
}

@Injectable()
export class OptionOverviewService {
  constructor(
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Gibt nur OptionCodes zurück, die mind. einen Wert in den Zuweisungen haben (kein NULL/leer),
   * eindeutig auf code, name, type, source (Matching über alle Felder!).
   */
  async getAllOptionCodesWithAtLeastOneValue(): Promise<
    OptionCodeOverviewDto[]
  > {
    const result = await this.dataSource.query<
      {
        code_int: number;
        code: string | number;
        name: string;
        type: string | null;
        source: string | null;
      }[]
    >(`
      SELECT
        CAST(oc.code AS integer) AS code_int,
        oc.code,
        oc.name,
        oc.type,
        oc.source
      FROM option_code oc
      WHERE EXISTS (
        SELECT 1
        FROM all_dhcp_option_assignments a
        WHERE a.option_code = oc.code
          AND a.option_name = oc.name
          AND (a.option_type IS NOT DISTINCT FROM oc.type)
          AND (a.option_source IS NOT DISTINCT FROM oc.source)
          AND a.option_value IS NOT NULL
          AND a.option_value <> ''
      )
      ORDER BY code_int ASC
    `);

    return result.map((row) => ({
      code: Number(row.code),
      name: row.name,
      type: row.type ?? null,
      source: row.source ?? null,
    }));
  }
}
