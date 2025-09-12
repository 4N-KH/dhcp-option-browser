import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('csp_credentials')
export class CspCredentialEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  region: string | null;

  @Column({ name: 'encrypted_api_key', type: 'text' })
  encryptedApiKey: string;

  @Column({ type: 'varchar', length: 32 })
  iv: string;

  @Column({ type: 'varchar', length: 32 })
  tag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
