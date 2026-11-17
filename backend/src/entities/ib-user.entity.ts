import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IbCompany } from './ib-company.entity';

@Entity('users')
export class IbUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'account_type', type: 'varchar', length: 16, default: 'PERSONAL' })
  accountType: string;

  @Column({ type: 'varchar', length: 16, default: 'MEMBER' })
  role: string;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => IbCompany, (c) => c.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: IbCompany | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 64, nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', length: 64, nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ name: 'stripe_price_id', type: 'varchar', length: 64, nullable: true })
  stripePriceId: string | null;

  @Column({ name: 'stripe_product_id', type: 'varchar', length: 64, nullable: true })
  stripeProductId: string | null;

  @Column({ name: 'stripe_subscription_status', type: 'varchar', length: 32, nullable: true })
  stripeSubscriptionStatus: string | null;

  @Column({ name: 'quota_feed_limit', type: 'int', nullable: true })
  quotaFeedLimit: number | null;

  @Column({ name: 'quota_story_limit', type: 'int', nullable: true })
  quotaStoryLimit: number | null;

  @Column({ name: 'quota_feed_used', type: 'int', default: 0 })
  quotaFeedUsed: number;

  @Column({ name: 'quota_story_used', type: 'int', default: 0 })
  quotaStoryUsed: number;

  @Column({ name: 'quota_genia_limit', type: 'int', nullable: true })
  quotaGeniaLimit: number | null;

  @Column({ name: 'quota_genia_used', type: 'int', default: 0 })
  quotaGeniaUsed: number;

  @Column({ name: 'quota_gen_video_limit', type: 'int', nullable: true })
  quotaGenVideoLimit: number | null;

  @Column({ name: 'quota_gen_video_used', type: 'int', default: 0 })
  quotaGenVideoUsed: number;

  @Column({ name: 'quota_whatsapp_group_baileys_limit', type: 'int', nullable: true })
  quotaWhatsappGroupBaileysLimit: number | null;

  @Column({ name: 'quota_whatsapp_broadcast_baileys_limit', type: 'int', nullable: true })
  quotaWhatsappBroadcastBaileysLimit: number | null;

  @Column({ name: 'quota_whatsapp_broadcast_meta_limit', type: 'int', nullable: true })
  quotaWhatsappBroadcastMetaLimit: number | null;

  @Column({ name: 'quota_instagram_accounts_limit', type: 'int', nullable: true })
  quotaInstagramAccountsLimit: number | null;

  @Column({ name: 'quota_tiktok_accounts_limit', type: 'int', nullable: true })
  quotaTiktokAccountsLimit: number | null;

  @Column({ name: 'quota_linkedin_accounts_limit', type: 'int', nullable: true })
  quotaLinkedinAccountsLimit: number | null;

  @Column({ name: 'quota_youtube_channels_limit', type: 'int', nullable: true })
  quotaYoutubeChannelsLimit: number | null;

  @Column({ name: 'quota_period_end', type: 'timestamptz', nullable: true })
  quotaPeriodEnd: Date | null;
}
