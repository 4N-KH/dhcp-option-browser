import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['region', 'loginHash'], { unique: true })
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  region: string;

  @Column({ type: 'varchar', length: 64 })
  loginHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
