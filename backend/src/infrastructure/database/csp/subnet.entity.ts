import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { AddressBlock } from './adress-block.entity';
import { SubnetDhcpOption } from './subnet-dhcp-option.entity';
import { SubnetOptionGroup } from './subnet-option-group.entity';

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

  // ---- NEU: AddressBlock als Parent-Ebene ----
  @ManyToOne(() => AddressBlock, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addressBlockId' })
  addressBlock?: AddressBlock;

  @Column({ nullable: true })
  addressBlockId?: number;

  // ---- IpSpace als Parent-Ebene (wenn kein AddressBlock) ----
  @ManyToOne(() => IpSpace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spaceId' })
  space?: IpSpace;

  @Column({ nullable: true })
  spaceId?: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @OneToMany(() => SubnetDhcpOption, (opt) => opt.subnet, { cascade: true })
  dhcpOptions: SubnetDhcpOption[];

  @OneToMany(() => SubnetOptionGroup, (sog) => sog.subnet, { cascade: true })
  optionGroups: SubnetOptionGroup[];
}
