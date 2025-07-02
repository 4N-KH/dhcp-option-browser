import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Range } from './range.entity';
import { OptionCodeEntity } from './option-code.entity';

@Entity({ name: 'range_dhcp_option' })
export class RangeDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Range, (range) => range.dhcpOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rangeId' })
  range: Range;

  @Column()
  rangeId: number;

  @Column({ type: 'varchar', nullable: true })
  group?: string | null;

  @Column()
  option_code: string;

  @Column()
  option_value: string;

  @Column()
  type: string;

  @ManyToOne(() => OptionCodeEntity, { nullable: true })
  @JoinColumn({ name: 'optionCodeId' })
  optionCode?: OptionCodeEntity;

  @Column({ nullable: true })
  optionCodeId?: number;
}
