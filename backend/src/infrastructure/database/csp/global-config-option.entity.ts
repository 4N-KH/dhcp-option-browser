import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DhcpGlobalConfig } from './global-config.entity';
import { OptionCodeEntity } from './option-code.entity';

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
  optionCode?: OptionCodeEntity | null;

  @Column({ nullable: true })
  optionCodeId?: number | null;
}
