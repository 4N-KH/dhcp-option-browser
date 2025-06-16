import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuthMode } from '../../domain/enums/auth-mode.enum';

@Entity()
export class CredentialEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: AuthMode,
  })
  mode: AuthMode;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  region?: string;

  @Column()
  encrypted: boolean;

  @Column()
  createdAt: Date;
}
