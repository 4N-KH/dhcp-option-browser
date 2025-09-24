import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { AddressBlock } from './address-block.entity';
import { SubnetDhcpOption } from './subnet-dhcp-option.entity';
import { SubnetOptionGroup } from './subnet-option-group.entity';

// Database entity for a DHCP subnet
@Entity({ name: 'subnet' })
export class Subnet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  cidr: number;

  // Optional parent address block
  @ManyToOne(() => AddressBlock, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addressBlockId' })
  addressBlock?: AddressBlock;

  @Column({ nullable: true })
  addressBlockId?: number;

  // Optional parent IP space (if no address block)
  @ManyToOne(() => IpSpace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spaceId' })
  space?: IpSpace;

  @Column({ nullable: true })
  spaceId?: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  // Related DHCP options
  @OneToMany(() => SubnetDhcpOption, (opt) => opt.subnet, { cascade: true })
  dhcpOptions: SubnetDhcpOption[];

  // Related option groups
  @OneToMany(() => SubnetOptionGroup, (sog) => sog.subnet, { cascade: true })
  optionGroups: SubnetOptionGroup[];
}
