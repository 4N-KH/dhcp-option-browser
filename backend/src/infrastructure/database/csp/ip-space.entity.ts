import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { IpSpaceDhcpOption } from './ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from './ip-space-option-group.entity';
import { AddressBlock } from './adress-block.entity';

@Entity({ name: 'ip_space' })
export class IpSpace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @OneToMany(() => IpSpaceDhcpOption, (opt) => opt.ipSpace, {
    cascade: true,
    eager: true,
  })
  dhcpOptions: IpSpaceDhcpOption[];

  @OneToMany(() => IpSpaceOptionGroup, (ipg) => ipg.ipSpace, {
    cascade: true,
  })
  optionGroups: IpSpaceOptionGroup[];

  @OneToMany(() => AddressBlock, (block) => block.ipSpace)
  addressBlocks: AddressBlock[];
}
