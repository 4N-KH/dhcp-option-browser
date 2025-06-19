export {};

import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

/**
 * Entity for DHCP Option Codes (metadata, NOT actual DHCP options on objects!)
 * Stores all relevant metadata for reporting, mapping, UI, etc.
 */
@Entity({ name: 'option_codes' })
@Unique(['code'])
export class OptionCodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  extId?: string;

  @Column({ type: 'int', unique: true })
  code: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', nullable: true })
  optionSpace?: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', nullable: true })
  raw?: Record<string, any>;
}
