import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Subnet } from './subnet.entity';
import { RangeDhcpOption } from './range-dhcp-option.entity';
import { RangeExclusion } from './range-exclusion.entity';
import { RangeOptionGroup } from './range-option-group.entity';

@Entity({ name: 'range' })
export class Range {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column()
  start: string;

  @Column()
  end: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @ManyToOne(() => Subnet, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subnetId' })
  subnet: Subnet;

  @Column()
  subnetId: number;

  @OneToMany(() => RangeDhcpOption, (opt) => opt.range, { cascade: true })
  dhcpOptions: RangeDhcpOption[];

  @OneToMany(() => RangeExclusion, (ex) => ex.range, { cascade: true })
  exclusionRanges: RangeExclusion[];

  @OneToMany(() => RangeOptionGroup, (rog) => rog.range)
  optionGroups: RangeOptionGroup[];
}
