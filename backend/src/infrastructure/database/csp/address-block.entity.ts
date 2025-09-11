import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { AddressBlockDhcpOption } from './address-block-dhcp-option.entity';
import { AddressBlockOptionGroup } from './address-block-option-group.entity';

@Entity({ name: 'address_block' })
export class AddressBlock {
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

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @ManyToOne(() => IpSpace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ipSpaceId' })
  ipSpace?: IpSpace;

  @Column({ nullable: true })
  ipSpaceId?: number;

  @ManyToOne(() => AddressBlock, (block) => block.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: AddressBlock;

  @Column({ nullable: true })
  parentId?: number;

  @OneToMany(() => AddressBlock, (block) => block.parent)
  children: AddressBlock[];

  @OneToMany(() => AddressBlockDhcpOption, (opt) => opt.addressBlock, {
    cascade: true,
    eager: true,
  })
  dhcpOptions: AddressBlockDhcpOption[];

  @OneToMany(() => AddressBlockOptionGroup, (abog) => abog.addressBlock)
  optionGroups: AddressBlockOptionGroup[];
}
