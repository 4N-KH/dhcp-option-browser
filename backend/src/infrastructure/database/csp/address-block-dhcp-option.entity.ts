import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AddressBlock } from './address-block.entity';
import { OptionCodeEntity } from './option-code.entity';
import { OptionSpace } from './option-space.entity';

@Entity({ name: 'address_block_dhcp_option' })
export class AddressBlockDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AddressBlock, (block) => block.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'addressBlockId' })
  addressBlock: AddressBlock;

  @Column()
  addressBlockId: number;

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
  optionSpace?: OptionSpace;

  @Column({ nullable: true })
  optionSpaceId?: number;
}
