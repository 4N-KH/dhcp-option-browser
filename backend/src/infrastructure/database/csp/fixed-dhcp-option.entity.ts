import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FixedAddress } from './fixed-address.entity';
import { OptionCodeEntity } from './option-code.entity';

@Entity({ name: 'fixed_address_dhcp_option' })
export class FixedDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FixedAddress, (fa) => fa.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fixedAddressId' })
  fixedAddress: FixedAddress;

  @Column()
  fixedAddressId: number;

  @Column({ type: 'text', nullable: true })
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
