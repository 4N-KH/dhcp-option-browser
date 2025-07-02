import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OptionGroup } from './option-group.entity';
import { OptionCodeEntity } from './option-code.entity';

@Entity({ name: 'option_group_dhcp_option' })
export class OptionGroupDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OptionGroup, (group) => group.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;

  @ManyToOne(() => OptionCodeEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'optionCodeId' })
  optionCode: OptionCodeEntity;

  @Column()
  optionCodeId: number;

  @Column()
  option_value: string;

  @Column()
  type: string;

  @Column({ type: 'varchar', nullable: true })
  group?: string | null;
}
