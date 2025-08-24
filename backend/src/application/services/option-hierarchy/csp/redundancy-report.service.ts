import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

export interface RedundancyReportDto {
  childType: ObjectType | string;
  childId: number;
  childLabel: string;
  parentType: ObjectType | string;
  parentId: number;
  parentLabel: string;
  optionCode: string;
  optionName?: string;
  optionValue: string | null;
  childGroup?: string | null;
  parentGroup?: string | null;
}

type RedundancyRow = {
  child_type: ObjectType | string;
  child_id: number;
  parent_type: ObjectType | string;
  parent_id: number;
  option_code: string;
  option_name?: string;
  option_value: string | null;
  child_group?: string | null;
  parent_group?: string | null;
};

@Injectable()
export class RedundancyReportService {
  constructor(private readonly dataSource: DataSource) {}

  async generateReport(): Promise<RedundancyReportDto[]> {
    const rows = await this.dataSource.query<RedundancyRow[]>(`
      SELECT 
        v.child_type,
        v.child_id,
        oc.name AS option_name,
        v.option_code,
        v.option_value,
        v.parent_type,
        v.parent_id,
        v.child_group,
        v.parent_group
      FROM redundant_dhcp_options_view v
      LEFT JOIN option_code oc ON oc.code = v.option_code
    `);

    return rows.map(
      (r): RedundancyReportDto => ({
        childType: r.child_type,
        childId: Number(r.child_id),
        childLabel: this.buildLabel(r.child_type, r.child_group, r.child_id),
        parentType: r.parent_type,
        parentId: Number(r.parent_id),
        parentLabel: this.buildLabel(
          r.parent_type,
          r.parent_group,
          r.parent_id,
        ),
        optionCode: r.option_code,
        optionName: r.option_name,
        optionValue: r.option_value,
        childGroup: r.child_group,
        parentGroup: r.parent_group,
      }),
    );
  }

  /**
   * Baut ein Label für das Objekt oder die Gruppe.
   * - Wenn der Typ `option_group` ist, wird der Gruppenname verwendet.
   * - Sonst wird `type #id` angezeigt.
   */
  private buildLabel(
    type: ObjectType | string,
    group: string | null | undefined,
    id: number,
  ): string {
    if (type === 'option_group') {
      return group ? `Group: ${group}` : `Group #${id}`;
    }
    return `${type} #${id}`;
  }
}
