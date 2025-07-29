// src/infrastructure/database/csp/all-dhcp-option-assignment.repository.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Interface für Zeilen der View: Alle Felder der View müssen enthalten sein!
export interface AllDhcpOptionAssignmentRow {
  object_type: string;
  object_id: number;
  object_label: string;
  address: string | null;
  cidr: string | null;
  ip_space: string | null;
  option_code: string;
  option_name: string;
  option_type: string | null;
  option_source: string | null;
  option_value: string;
  optionSpaceId: number | null;
  optionCodeId: number | null;
  object_display: string;
}

@Injectable()
export class AllDhcpOptionAssignmentRepository {
  constructor(private dataSource: DataSource) {}

  /**
   * Liefert alle Optionen für ein gegebenes Code/Name/Type/Source
   */
  async findByOptionCodeNameTypeSource(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ): Promise<AllDhcpOptionAssignmentRow[]> {
    const query = `
      SELECT *
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2
      ${type ? `AND option_type = $3` : ''}
      ${source ? (type ? `AND option_source = $4` : `AND option_source = $3`) : ''}
    `;
    const params: any[] = [code, name];
    if (type) params.push(type);
    if (source) params.push(source);
    // Typisiere Rückgabe explizit!
    return this.dataSource.query(query, params);
  }

  /**
   * Liefert alle Werte einer Option (mit objectCount), direkt aus der View aggregiert!
   */
  async findValuesByOptionKey(
    code: string,
    name: string,
    type?: string,
    source?: string,
  ): Promise<{ value: string; objectCount: number }[]> {
    const query = `
      SELECT option_value as value, COUNT(*)::int as "objectCount"
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2
      ${type ? `AND option_type = $3` : ''}
      ${source ? (type ? `AND option_source = $4` : `AND option_source = $3`) : ''}
      GROUP BY option_value
      ORDER BY "objectCount" DESC
    `;
    const params: any[] = [code, name];
    if (type) params.push(type);
    if (source) params.push(source);
    return this.dataSource.query(query, params);
  }

  /**
   * Liefert alle Objekte, bei denen die Option mit genau diesem Wert gesetzt ist
   */
  async findOccurrencesForOptionValue(
    code: string,
    name: string,
    value: string,
    type?: string,
    source?: string,
  ): Promise<AllDhcpOptionAssignmentRow[]> {
    const query = `
      SELECT *
      FROM all_dhcp_option_assignments
      WHERE option_code = $1 AND option_name = $2 AND option_value = $3
      ${type ? `AND option_type = $4` : ''}
      ${source ? (type ? `AND option_source = $5` : `AND option_source = $4`) : ''}
    `;
    const params: any[] = [code, name, value];
    if (type) params.push(type);
    if (source) params.push(source);
    // Typisiere Rückgabe explizit!
    return this.dataSource.query(query, params);
  }

  /**
   * Falls du alle Zeilen brauchst (z.B. für Admin-Tools)
   */
  async findAll(): Promise<AllDhcpOptionAssignmentRow[]> {
    return this.dataSource.query(`SELECT * FROM all_dhcp_option_assignments`);
  }
}
