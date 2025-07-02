import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IpSpace } from './ip-space.entity';
import { OptionCodeEntity } from './option-code.entity';

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

  @Column({ type: 'varchar', nullable: true }) // <- HIER ÄNDERN!
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
