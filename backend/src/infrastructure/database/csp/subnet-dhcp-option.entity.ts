import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subnet } from './subnet.entity';
import { OptionCodeEntity } from './option-code.entity';
import { OptionSpace } from './option-space.entity';

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
  optionSpace?: OptionSpace | null;

  @Column({ nullable: true })
  optionSpaceId?: number | null;
}
