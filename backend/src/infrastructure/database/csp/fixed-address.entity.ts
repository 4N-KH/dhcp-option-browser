import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { Subnet } from './subnet.entity';
import { FixedDhcpOption } from './fixed-dhcp-option.entity';

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

  @ManyToOne(() => IpSpace, { nullable: false })
  @JoinColumn({ name: 'ipSpaceId' })
  ipSpace: IpSpace;

  @Column()
  ipSpaceId: number;

  @Column()
  match_type: string;

  @Column()
  match_value: string;

  @Column({ nullable: true, type: 'text' })
  comment?: string | null;

  @ManyToOne(() => Subnet, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Subnet;

  @Column({ nullable: true })
  parentId?: number;

  @OneToMany(() => FixedDhcpOption, (opt) => opt.fixedAddress, {
    cascade: true,
  })
  dhcpOptions: FixedDhcpOption[];

  @Column({ type: 'jsonb', nullable: true })
  inheritance_sources?: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
