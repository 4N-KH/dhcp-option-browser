import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { AddressBlock } from './address-block.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'address_block_option_group' })
export class AddressBlockOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AddressBlock, (block) => block.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'addressBlockId' })
  addressBlock: AddressBlock;

  @Column()
  addressBlockId: number;

  @ManyToOne(() => OptionGroup, (group) => group.addressBlockOptionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
