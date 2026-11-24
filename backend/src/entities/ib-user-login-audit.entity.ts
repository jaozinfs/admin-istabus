import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_login_audits')
export class IbUserLoginAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'token_hint', type: 'varchar', length: 64, nullable: true })
  tokenHint: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  path: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
