import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Region } from '@/domain/enums/csp/region.enum';

@Entity('csp_credentials')
export class CspCredentialEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: Region,
  })
  region: Region;

  @Column({ name: 'encrypted_api_key', type: 'text' })
  encryptedApiKey: string;

  @Column({ type: 'varchar', length: 32 })
  iv: string;

  @Column({ type: 'varchar', length: 32 })
  tag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
