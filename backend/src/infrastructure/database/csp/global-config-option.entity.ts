import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DhcpGlobalConfig } from './global-config.entity';
import { OptionCodeEntity } from './option-code.entity';
import { OptionSpace } from './option-space.entity';

@Entity({ name: 'dhcp_global_config_option' })
export class DhcpGlobalConfigOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DhcpGlobalConfig, (gc) => gc.dhcpOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'globalConfigId' })
  globalConfig: DhcpGlobalConfig;

  @Column()
  globalConfigId: number;

  @Column()
  option_code: string;

  @Column()
  option_value: string;

  @Column()
  type: string;

  @ManyToOne(() => OptionCodeEntity, { nullable: true })
  @JoinColumn({ name: 'optionCodeId' })
  optionCode?: OptionCodeEntity | null;

  @Column({ nullable: true })
  optionCodeId?: number | null;

  @ManyToOne(() => OptionSpace, { nullable: true })
  @JoinColumn({ name: 'optionSpaceId' })
  optionSpace?: OptionSpace | null;

  @Column({ nullable: true })
  optionSpaceId?: number | null;
}
