import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OptionCodeEntity } from './option-code.entity';

@Entity({ name: 'option_space' })
export class OptionSpace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', nullable: true })
  protocol?: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'created_at' })
  createdAt?: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'updated_at' })
  updatedAt?: string | null;

  @OneToMany(() => OptionCodeEntity, (code) => code.optionSpace)
  optionCodes: OptionCodeEntity[];
}
