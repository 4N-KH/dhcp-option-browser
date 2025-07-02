import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
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

  @ManyToOne(() => Subnet, (subnet) => subnet.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Subnet;

  @Column({ nullable: true })
  parentId?: number;

  @OneToMany(() => Subnet, (subnet) => subnet.parent)
  children: Subnet[];

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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
