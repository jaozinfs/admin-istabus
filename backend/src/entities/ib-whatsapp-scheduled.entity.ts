import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('whatsapp_scheduled_messages')
export class IbWhatsappScheduled {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ name: 'target_group_name', type: 'varchar', length: 255 })
  targetGroupName: string;

  @Column({ name: 'target_type', type: 'varchar', length: 16, default: 'group' })
  targetType: string;

  @Column({ type: 'varchar', length: 16, default: 'baileys' })
  provider: string;

  @Column({ name: 'broadcast_tag', type: 'varchar', length: 80, nullable: true })
  broadcastTag: string | null;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 32, default: 'scheduled' })
  status: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'broadcast_status', type: 'varchar', length: 24, nullable: true })
  broadcastStatus: string | null;

  @Column({ name: 'broadcast_total', type: 'int', default: 0 })
  broadcastTotal: number;

  @Column({ name: 'broadcast_processed', type: 'int', default: 0 })
  broadcastProcessed: number;

  @Column({ name: 'broadcast_accepted', type: 'int', default: 0 })
  broadcastAccepted: number;

  @Column({ name: 'broadcast_failed', type: 'int', default: 0 })
  broadcastFailed: number;

  @Column({ name: 'broadcast_pending', type: 'int', default: 0 })
  broadcastPending: number;

  @Column({ name: 'broadcast_delivered', type: 'int', default: 0 })
  broadcastDelivered: number;

  @Column({ name: 'broadcast_held', type: 'int', default: 0 })
  broadcastHeld: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
