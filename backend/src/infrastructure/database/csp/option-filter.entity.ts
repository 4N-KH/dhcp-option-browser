import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Falls nötig, importiere das DTO, das du wirklich verwendest:
export interface CspDhcpOption {
  group?: string | null;
  option_code: string;
  option_value: string;
  type: string;
}

export interface OptionFilterRule {
  compare: string;
  option_code: string;
  option_value: string;
  substring_offset?: number | null;
}

export interface OptionFilterRulesContainer {
  match?: string | null;
  rules?: OptionFilterRule[];
}

@Entity({ name: 'option_filter' })
export class OptionFilter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  protocol?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ nullable: true })
  comment?: string;

  @Column({ nullable: true })
  vendorSpecificOptionOptionSpace?: string;

  @Column({ nullable: true })
  createdAt?: string;

  @Column({ nullable: true })
  updatedAt?: string;

  @Column({ type: 'jsonb', nullable: true })
  dhcpOptions?: CspDhcpOption[];

  @Column({ type: 'jsonb', nullable: true })
  rules?: OptionFilterRulesContainer;
}
