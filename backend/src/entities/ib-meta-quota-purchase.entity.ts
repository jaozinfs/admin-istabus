import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('whatsapp_meta_quota_purchases')
export class IbMetaQuotaPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar', length: 16 })
  scope: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'expected_amount_cents', type: 'int' })
  expectedAmountCents: number;

  @Column({ type: 'varchar', length: 8, default: 'brl' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({
    name: 'stripe_checkout_session_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  stripeCheckoutSessionId: string | null;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  stripePaymentIntentId: string | null;

  @Column({ name: 'stripe_event_id', type: 'varchar', length: 128, nullable: true })
  stripeEventId: string | null;

  @Column({ name: 'credited_at', type: 'timestamptz', nullable: true })
  creditedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
