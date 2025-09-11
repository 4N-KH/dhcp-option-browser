import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { DhcpGlobalConfig } from './global-config.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ name: 'dhcp_global_config_option_group' })
export class DhcpGlobalConfigOptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DhcpGlobalConfig, (gc) => gc.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'globalConfigId' })
  globalConfig: DhcpGlobalConfig;

  @Column()
  globalConfigId: number;

  @ManyToOne(() => OptionGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionGroupId' })
  optionGroup: OptionGroup;

  @Column()
  optionGroupId: number;
}
