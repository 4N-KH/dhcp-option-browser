import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { FixedAddress } from './fixed-address.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'fixed_address_option_group' })
export class FixedAddressOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FixedAddress, (fa) => fa.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fixedAddressId' })
  fixedAddress: FixedAddress;

  @Column()
  fixedAddressId: number;

  @ManyToOne(() => OptionGroup, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
