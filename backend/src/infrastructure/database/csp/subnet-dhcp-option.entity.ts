import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subnet } from './subnet.entity';
import { OptionCodeEntity } from './option-code.entity';

@Entity({ name: 'subnet_dhcp_option' })
export class SubnetDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subnet, (subnet) => subnet.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subnetId' })
  subnet: Subnet;

  @Column()
  subnetId: number;

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
