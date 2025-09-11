import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Range } from './range.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'range_option_group' })
export class RangeOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Range, (range) => range.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rangeId' })
  range: Range;

  @Column()
  rangeId: number;

  @ManyToOne(() => OptionGroup, (group) => group.rangeOptionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
