import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IbMetaQuotaPurchase } from '../entities/ib-meta-quota-purchase.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbUserLoginAudit } from '../entities/ib-user-login-audit.entity';
import { IbWhatsappScheduled } from '../entities/ib-whatsapp-scheduled.entity';

@Injectable()
export class OpsService {
  private tokenHintReady: boolean | null = null;

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

  /** Garante coluna token_hint (shared DB; migration InstaBuss pode ainda não ter rodado). */
  private async ensureTokenHintColumn(): Promise<boolean> {
    if (this.tokenHintReady != null) return this.tokenHintReady;
    try {
      await this.logins.query(`
        ALTER TABLE "user_login_audits"
        ADD COLUMN IF NOT EXISTS "token_hint" character varying(64)
      `);
      this.tokenHintReady = true;
    } catch {
      try {
        const rows: Array<{ exists: boolean }> = await this.logins.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'user_login_audits'
              AND column_name = 'token_hint'
          ) AS "exists"
        `);
        this.tokenHintReady = Boolean(rows?.[0]?.exists);
      } catch {
        this.tokenHintReady = false;
      }
    }
    return this.tokenHintReady;
  }

  /**
   * Dia civil America/Sao_Paulo (UTC-3 o ano todo desde 2019).
   * `date` = YYYY-MM-DD; sem date → hoje SP.
   */
  private dayRange(date?: string) {
    const tz = 'America/Sao_Paulo';
    const day =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
        ? date.trim()
        : new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());
    const start = new Date(`${day}T00:00:00-03:00`);
    const end = new Date(`${day}T24:00:00-03:00`);
    return { start, end, day, timezone: tz };
  }

  /** Intervalo SP a partir de from/to (YYYY-MM-DD). to é inclusivo. */
  private rangeBounds(from?: string, to?: string) {
    const tz = 'America/Sao_Paulo';
    let start: Date | null = null;
    let end: Date | null = null;
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from.trim())) {
      start = new Date(`${from.trim()}T00:00:00-03:00`);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to.trim())) {
      end = new Date(`${to.trim()}T24:00:00-03:00`);
    }
    return { start, end, timezone: tz };
  }

  async listBroadcasts(query: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    date?: string;
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

    if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date.trim())) {
      const { start, end } = this.dayRange(query.date);
      qb.andWhere('m.scheduled_at >= :from AND m.scheduled_at < :to', {
        from: start,
        to: end,
      });
    } else {
      const { start, end } = this.rangeBounds(query.from, query.to);
      if (start) qb.andWhere('m.scheduled_at >= :from', { from: start });
      if (end) qb.andWhere('m.scheduled_at < :to', { to: end });
    }

    const q = query.q?.trim();
    if (q) {
      qb.andWhere(
        `(m.target_group_name ILIKE :q OR u.email ILIKE :q OR u.name ILIKE :q OR CAST(m.id AS text) ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const totalsRow = await qb
      .clone()
      .select([
        'COALESCE(SUM(m.broadcast_total), 0) AS "dispatchedTotal"',
        'COALESCE(SUM(m.broadcast_delivered), 0) AS "deliveredTotal"',
        'COALESCE(SUM(m.broadcast_accepted), 0) AS "acceptedTotal"',
        'COUNT(*) AS "rowCount"',
      ])
      .getRawOne<{
        dispatchedTotal: string;
        deliveredTotal: string;
        acceptedTotal: string;
        rowCount: string;
      }>();

    const total = Number(totalsRow?.rowCount ?? 0);
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
      summary: {
        dispatchedTotal: Number(totalsRow?.dispatchedTotal ?? 0),
        deliveredTotal: Number(totalsRow?.deliveredTotal ?? 0),
        acceptedTotal: Number(totalsRow?.acceptedTotal ?? 0),
      },
      timezone: 'America/Sao_Paulo',
    };
  }

  async listPurchases(query: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
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
    if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date.trim())) {
      const { start, end } = this.dayRange(query.date);
      qb.andWhere('p.created_at >= :from AND p.created_at < :to', {
        from: start,
        to: end,
      });
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
      timezone: 'America/Sao_Paulo',
    };
  }

  async listLogins(query: {
    q?: string;
    page?: number;
    limit?: number;
    success?: string;
    date?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    try {
      const exists: Array<{ exists: boolean }> = await this.logins.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'user_login_audits'
        ) AS "exists"
      `);
      if (!exists?.[0]?.exists) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          pageCount: 1,
          day: null,
          timezone: 'America/Sao_Paulo',
          warning: 'Tabela user_login_audits ainda não existe no banco.',
        };
      }
    } catch {
      return {
        items: [],
        total: 0,
        page,
        limit,
        pageCount: 1,
        day: null,
        timezone: 'America/Sao_Paulo',
        warning: 'Não foi possível ler user_login_audits.',
      };
    }

    const hasTokenHint = await this.ensureTokenHintColumn();

    const selectCols = [
      'a.id AS id',
      'a.user_id AS "userId"',
      'a.email AS email',
      'a.success AS success',
      'a.reason AS reason',
      'a.ip AS ip',
      'a.user_agent AS "userAgent"',
      'a.created_at AS "createdAt"',
      'u.name AS "userName"',
    ];
    if (hasTokenHint) selectCols.splice(7, 0, 'a.token_hint AS "tokenHint"');

    const qb = this.logins
      .createQueryBuilder('a')
      .leftJoin(IbUser, 'u', 'u.id = a.user_id')
      .select(selectCols)
      .orderBy('a.created_at', 'DESC');

    if (query.success === 'true') qb.andWhere('a.success = true');
    if (query.success === 'false') qb.andWhere('a.success = false');

    let day: string | null = null;
    if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date.trim())) {
      const range = this.dayRange(query.date);
      day = range.day;
      qb.andWhere('a.created_at >= :from AND a.created_at < :to', {
        from: range.start,
        to: range.end,
      });
    } else {
      const { start, end } = this.rangeBounds(query.from, query.to);
      if (start) qb.andWhere('a.created_at >= :from', { from: start });
      if (end) qb.andWhere('a.created_at < :to', { to: end });
    }

    const q = query.q?.trim();
    if (q) {
      const tokenClause = hasTokenHint ? ' OR a.token_hint ILIKE :q' : '';
      qb.andWhere(
        `(a.email ILIKE :q OR a.ip ILIKE :q OR a.reason ILIKE :q OR a.user_agent ILIKE :q OR u.name ILIKE :q${tokenClause})`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const dayTokenByKey = new Map<string, string>();
    if (day && hasTokenHint) {
      const { start, end } = this.dayRange(day);
      const tokenRows = await this.logins
        .createQueryBuilder('a')
        .select([
          'a.user_id AS "userId"',
          'a.email AS email',
          'a.token_hint AS "tokenHint"',
          'a.created_at AS "createdAt"',
        ])
        .where('a.created_at >= :from AND a.created_at < :to', { from: start, to: end })
        .andWhere('a.token_hint IS NOT NULL')
        .orderBy('a.created_at', 'DESC')
        .getRawMany<{
          userId: string | null;
          email: string;
          tokenHint: string;
          createdAt: Date;
        }>();
      for (const row of tokenRows) {
        const keys = [
          row.userId ? `u:${row.userId}` : null,
          row.email ? `e:${String(row.email).toLowerCase()}` : null,
        ].filter(Boolean) as string[];
        for (const key of keys) {
          if (!dayTokenByKey.has(key)) dayTokenByKey.set(key, row.tokenHint);
        }
      }
    }

    return {
      items: rows.map((row) => {
        const own = hasTokenHint ? ((row.tokenHint as string | null) || null) : null;
        const dayToken =
          own ||
          (row.userId ? dayTokenByKey.get(`u:${row.userId}`) : undefined) ||
          (row.email
            ? dayTokenByKey.get(`e:${String(row.email).toLowerCase()}`)
            : undefined) ||
          null;
        return {
          id: row.id,
          userId: row.userId,
          email: row.email,
          userName: row.userName,
          success: row.success === true || row.success === 'true',
          reason: row.reason,
          ip: row.ip,
          userAgent: row.userAgent,
          tokenHint: own,
          dayTokenHint: dayToken,
          createdAt: row.createdAt,
        };
      }),
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      day,
      timezone: 'America/Sao_Paulo',
    };
  }
}
