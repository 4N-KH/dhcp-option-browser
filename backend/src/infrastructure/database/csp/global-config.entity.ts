import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DhcpGlobalConfigOption } from './global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from './global-config-option-group.entity';

@Entity({ name: 'dhcp_global_config' })
export class DhcpGlobalConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @OneToMany(() => DhcpGlobalConfigOption, (opt) => opt.globalConfig, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  dhcpOptions: DhcpGlobalConfigOption[];

  @OneToMany(() => DhcpGlobalConfigOptionGroup, (gog) => gog.globalConfig, {
    cascade: true,
    eager: true,
  })
  optionGroups: DhcpGlobalConfigOptionGroup[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
