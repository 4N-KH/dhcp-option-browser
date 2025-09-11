import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OptionSpace } from './option-space.entity';

@Entity({ name: 'option_code' })
export class OptionCodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  type?: string | null;

  @ManyToOne(() => OptionSpace, (space) => space.optionCodes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'optionSpaceId' })
  optionSpace?: OptionSpace;

  @Column({ nullable: true })
  optionSpaceId?: number | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', nullable: true })
  source?: string | null;

  @Column({ type: 'boolean', nullable: true })
  array?: boolean | null;

  @Column({ type: 'varchar', nullable: true, name: 'created_at' })
  createdAt?: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'updated_at' })
  updatedAt?: string | null;
}
