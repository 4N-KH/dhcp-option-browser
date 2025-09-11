import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Subnet } from './subnet.entity';
import { Range } from './range.entity';
import { FixedDhcpOption } from './fixed-dhcp-option.entity';
import { FixedAddressOptionGroup } from './fixed-address-option-group.entity';

@Entity({ name: 'fixed_address' })
export class FixedAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @ManyToOne(() => Subnet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subnetId' })
  subnet?: Subnet;

  @Column({ nullable: true })
  subnetId?: number | null;

  @ManyToOne(() => Range, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rangeId' })
  range?: Range;

  @Column({ nullable: true })
  rangeId?: number | null;

  @Column()
  match_type: string;

  @Column()
  match_value: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @OneToMany(() => FixedDhcpOption, (opt) => opt.fixedAddress, {
    cascade: true,
  })
  dhcpOptions: FixedDhcpOption[];

  @OneToMany(() => FixedAddressOptionGroup, (faog) => faog.fixedAddress, {
    cascade: true,
  })
  optionGroups: FixedAddressOptionGroup[];
}
