// backend/src/infrastructure/database/csp/range-exclusion.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Range } from './range.entity';

@Entity({ name: 'range_exclusion' })
export class RangeExclusion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Range, (range) => range.exclusionRanges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rangeId' })
  range: Range;

  @Column()
  rangeId: number;

  @Column()
  start: string;

  @Column()
  end: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;
}
