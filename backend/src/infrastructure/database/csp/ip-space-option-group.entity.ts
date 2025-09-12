import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'ip_space_option_group' })
export class IpSpaceOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IpSpace, (ipSpace) => ipSpace.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ipSpaceId' })
  ipSpace: IpSpace;

  @Column()
  ipSpaceId: number;

  @ManyToOne(() => OptionGroup, (og) => og.ipSpaceOptionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
