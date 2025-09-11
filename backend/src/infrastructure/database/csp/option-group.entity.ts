import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OptionGroupDhcpOption } from './option-group-dhcp-option.entity';
import { SubnetOptionGroup } from './subnet-option-group.entity';
import { AddressBlockOptionGroup } from './address-block-option-group.entity';
import { RangeOptionGroup } from './range-option-group.entity';
import { DhcpGlobalConfigOptionGroup } from './global-config-option-group.entity';
import { IpSpaceOptionGroup } from './ip-space-option-group.entity';
import { FixedAddressOptionGroup } from './fixed-address-option-group.entity'; // NEU

@Entity({ name: 'option_group' })
export class OptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  comment?: string;

  @Column({ nullable: true })
  protocol?: string;

  // Timestamps
  // @CreateDateColumn()
  // createdAt: Date;
  // @UpdateDateColumn()
  // updatedAt: Date;

  @OneToMany(() => OptionGroupDhcpOption, (ogdo) => ogdo.optionGroup)
  dhcpOptions: OptionGroupDhcpOption[];

  @OneToMany(() => SubnetOptionGroup, (sog) => sog.optionGroup)
  subnetOptionGroups: SubnetOptionGroup[];

  @OneToMany(() => AddressBlockOptionGroup, (abog) => abog.optionGroup)
  addressBlockOptionGroups: AddressBlockOptionGroup[];

  @OneToMany(() => RangeOptionGroup, (rog) => rog.optionGroup)
  rangeOptionGroups: RangeOptionGroup[];

  @OneToMany(() => DhcpGlobalConfigOptionGroup, (gcog) => gcog.optionGroup)
  globalConfigOptionGroups: DhcpGlobalConfigOptionGroup[];

  @OneToMany(() => IpSpaceOptionGroup, (ipg) => ipg.optionGroup)
  ipSpaceOptionGroups: IpSpaceOptionGroup[];

  @OneToMany(() => FixedAddressOptionGroup, (faog) => faog.optionGroup) // NEU
  fixedAddressOptionGroups: FixedAddressOptionGroup[];
}
