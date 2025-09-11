import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Range } from './range.entity';
import { OptionCodeEntity } from './option-code.entity';
import { OptionSpace } from './option-space.entity';

@Entity({ name: 'range_dhcp_option' })
export class RangeDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Range, (range) => range.dhcpOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rangeId' })
  range: Range;

  @Column()
  rangeId: number;

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

  @ManyToOne(() => OptionSpace, { nullable: true })
  @JoinColumn({ name: 'optionSpaceId' })
  optionSpace?: OptionSpace | null;

  @Column({ nullable: true })
  optionSpaceId?: number | null;
}
