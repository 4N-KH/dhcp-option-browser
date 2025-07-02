import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AddressBlock } from './adress-block.entity';
import { OptionCodeEntity } from './option-code.entity';

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
