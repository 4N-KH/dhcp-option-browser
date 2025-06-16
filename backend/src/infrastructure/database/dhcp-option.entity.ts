import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DhcpOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: number;

  @Column()
  value: string;

  @Column()
  origin: string;
}
