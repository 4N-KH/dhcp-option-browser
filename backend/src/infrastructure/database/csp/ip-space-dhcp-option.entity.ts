import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { OptionCodeEntity } from './option-code.entity';
import { OptionSpace } from './option-space.entity';

@Entity({ name: 'ip_space_dhcp_option' })
export class IpSpaceDhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IpSpace, (ipSpace) => ipSpace.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ipSpaceId' })
  ipSpace: IpSpace;

  @Column()
  ipSpaceId: number;

  @Column()
  option_code: string;

  @Column()
  option_value: string;

  @Column({ type: 'varchar', nullable: true })
  type?: string | null;

  @ManyToOne(() => OptionCodeEntity, { nullable: true })
  @JoinColumn({ name: 'optionCodeId' })
  optionCode?: OptionCodeEntity;

  @Column({ nullable: true })
  optionCodeId?: number;

  @ManyToOne(() => OptionSpace, { nullable: true })
  @JoinColumn({ name: 'optionSpaceId' })
  optionSpace?: OptionSpace;

  @Column({ nullable: true })
  optionSpaceId?: number;
}
