import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IbMetaQuotaPurchase } from '../entities/ib-meta-quota-purchase.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbUserLoginAudit } from '../entities/ib-user-login-audit.entity';
import { IbWhatsappScheduled } from '../entities/ib-whatsapp-scheduled.entity';

@Injectable()
export class OpsService {
  constructor(
    @InjectRepository(IbWhatsappScheduled)
    private readonly scheduled: Repository<IbWhatsappScheduled>,
    @InjectRepository(IbMetaQuotaPurchase)
    private readonly purchases: Repository<IbMetaQuotaPurchase>,
    @InjectRepository(IbUserLoginAudit)
    private readonly logins: Repository<IbUserLoginAudit>,
    @InjectRepository(IbUser)
    private readonly users: Repository<IbUser>,
  ) {}

  async listBroadcasts(query: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const qb = this.scheduled
      .createQueryBuilder('m')
      .leftJoin(IbUser, 'u', 'u.id = m.user_id')
      .select([
        'm.id AS id',
        'm.user_id AS "userId"',
        'm.company_id AS "companyId"',
        'm.target_group_name AS name',
        'm.broadcast_status AS status',
        'm.provider AS provider',
        'm.broadcast_total AS total',
        'm.broadcast_accepted AS accepted',
        'm.broadcast_delivered AS delivered',
        'm.broadcast_failed AS failed',
        'm.broadcast_pending AS pending',
        'm.scheduled_at AS "scheduledAt"',
        'm.created_at AS "createdAt"',
        'u.email AS "userEmail"',
        'u.name AS "userName"',
      ])
      .where(`m.target_type = 'broadcast'`);

    if (query.status?.trim()) {
      qb.andWhere('m.broadcast_status = :status', { status: query.status.trim() });
    }
    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) qb.andWhere('m.scheduled_at >= :from', { from });
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) qb.andWhere('m.scheduled_at < :to', { to });
    }
    const q = query.q?.trim();
    if (q) {
      qb.andWhere(
        `(m.target_group_name ILIKE :q OR u.email ILIKE :q OR u.name ILIKE :q OR CAST(m.id AS text) ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy('m.scheduled_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        companyId: row.companyId,
        name: row.name,
        status: row.status,
        provider: row.provider,
        total: Number(row.total ?? 0),
        accepted: Number(row.accepted ?? 0),
        delivered: Number(row.delivered ?? 0),
        failed: Number(row.failed ?? 0),
        pending: Number(row.pending ?? 0),
        scheduledAt: row.scheduledAt,
        createdAt: row.createdAt,
        userEmail: row.userEmail,
        userName: row.userName,
      })),
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listPurchases(query: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const qb = this.purchases
      .createQueryBuilder('p')
      .leftJoin(IbUser, 'u', 'u.id = p.user_id')
      .select([
        'p.id AS id',
        'p.user_id AS "userId"',
        'p.company_id AS "companyId"',
        'p.scope AS scope',
        'p.quantity AS quantity',
        'p.expected_amount_cents AS "expectedAmountCents"',
        'p.currency AS currency',
        'p.status AS status',
        'p.reject_reason AS "rejectReason"',
        'p.stripe_checkout_session_id AS "stripeCheckoutSessionId"',
        'p.stripe_payment_intent_id AS "stripePaymentIntentId"',
        'p.credited_at AS "creditedAt"',
        'p.created_at AS "createdAt"',
        'u.email AS "userEmail"',
        'u.name AS "userName"',
        'u.stripe_customer_id AS "stripeCustomerId"',
      ]);

    if (query.status?.trim()) {
      qb.andWhere('p.status = :status', { status: query.status.trim() });
    }
    const q = query.q?.trim();
    if (q) {
      qb.andWhere(
        `(u.email ILIKE :q OR u.name ILIKE :q OR p.stripe_checkout_session_id ILIKE :q OR p.stripe_payment_intent_id ILIKE :q OR CAST(p.id AS text) ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy('p.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return {
      items: rows.map((row) => {
        const pi = row.stripePaymentIntentId as string | null;
        const session = row.stripeCheckoutSessionId as string | null;
        const customer = row.stripeCustomerId as string | null;
        return {
          id: row.id,
          userId: row.userId,
          companyId: row.companyId,
          scope: row.scope,
          quantity: Number(row.quantity ?? 0),
          expectedAmountCents: Number(row.expectedAmountCents ?? 0),
          currency: row.currency,
          status: row.status,
          rejectReason: row.rejectReason,
          stripeCheckoutSessionId: session,
          stripePaymentIntentId: pi,
          stripeCustomerId: customer,
          stripeDashboardUrl: pi
            ? `https://dashboard.stripe.com/payments/${encodeURIComponent(pi)}`
            : session
              ? `https://dashboard.stripe.com/search?query=${encodeURIComponent(session)}`
              : customer
                ? `https://dashboard.stripe.com/customers/${encodeURIComponent(customer)}`
                : null,
          creditedAt: row.creditedAt,
          createdAt: row.createdAt,
          userEmail: row.userEmail,
          userName: row.userName,
        };
      }),
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listLogins(query: {
    q?: string;
    page?: number;
    limit?: number;
    success?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const qb = this.logins.createQueryBuilder('a').orderBy('a.created_at', 'DESC');

    if (query.success === 'true') qb.andWhere('a.success = true');
    if (query.success === 'false') qb.andWhere('a.success = false');
    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) qb.andWhere('a.created_at >= :from', { from });
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) qb.andWhere('a.created_at < :to', { to });
    }
    const q = query.q?.trim();
    if (q) {
      qb.andWhere(
        `(a.email ILIKE :q OR a.ip ILIKE :q OR a.reason ILIKE :q OR a.user_agent ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        email: row.email,
        success: row.success,
        reason: row.reason,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      timezone: 'America/Sao_Paulo',
    };
  }
}
