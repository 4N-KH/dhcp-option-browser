// src/infrastructure/database/csp/all-dhcp-option-assignment.entity.ts

import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'all_dhcp_option_assignments' })
export class AllDhcpOptionAssignment {
  @ViewColumn()
  object_type: string;

  @ViewColumn()
  object_id: number;

  @ViewColumn()
  object_label: string;

  @ViewColumn()
  option_code: string;

  @ViewColumn()
  option_name: string;

  @ViewColumn()
  option_type: string;

  @ViewColumn()
  option_source: string;

  @ViewColumn()
  option_value: string;

  @ViewColumn()
  optionspaceid: number;

  @ViewColumn()
  optioncodeid: number;
}
