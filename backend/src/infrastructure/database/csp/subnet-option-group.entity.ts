import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Subnet } from './subnet.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'subnet_option_group' })
export class SubnetOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subnet, (subnet) => subnet.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subnetId' })
  subnet: Subnet;

  @Column()
  subnetId: number;

  @ManyToOne(() => OptionGroup, (og) => og.subnetOptionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
