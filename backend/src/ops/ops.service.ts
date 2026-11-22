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

  /**
   * Contas únicas que mexeram no site no período (1 linha por user/e-mail).
   * Não lista cada `api_activity` — só a última atividade + quantas ações no filtro.
   */
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
          uniqueAccounts: true,
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
        uniqueAccounts: true,
        warning: 'Não foi possível ler user_login_audits.',
      };
    }

    const hasTokenHint = await this.ensureTokenHintColumn();
    const params: unknown[] = [];
    const where: string[] = ['1=1'];

    let day: string | null = null;
    if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date.trim())) {
      const range = this.dayRange(query.date);
      day = range.day;
      params.push(range.start, range.end);
      where.push(
        `a.created_at >= $${params.length - 1} AND a.created_at < $${params.length}`,
      );
    } else {
      const { start, end } = this.rangeBounds(query.from, query.to);
      if (start) {
        params.push(start);
        where.push(`a.created_at >= $${params.length}`);
      }
      if (end) {
        params.push(end);
        where.push(`a.created_at < $${params.length}`);
      }
    }

    if (query.success === 'true') where.push('a.success = true');
    if (query.success === 'false') where.push('a.success = false');

    const q = query.q?.trim();
    if (q) {
      params.push(`%${q}%`);
      const qi = params.length;
      const tokenClause = hasTokenHint ? ` OR a.token_hint ILIKE $${qi}` : '';
      where.push(
        `(a.email ILIKE $${qi} OR a.ip ILIKE $${qi} OR COALESCE(a.reason, '') ILIKE $${qi} OR COALESCE(a.user_agent, '') ILIKE $${qi} OR COALESCE(u.name, '') ILIKE $${qi}${tokenClause})`,
      );
    }

    const tokenCol = hasTokenHint ? 'a.token_hint' : 'NULL::varchar';
    const whereSql = where.join(' AND ');

    const countRows: Array<{ total: string | number }> = await this.logins.query(
      `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT DISTINCT COALESCE(a.user_id::text, 'e:' || lower(a.email)) AS account_key
        FROM user_login_audits a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE ${whereSql}
      ) t
      `,
      params,
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const offset = (page - 1) * limit;
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const rows: Array<Record<string, unknown>> = await this.logins.query(
      `
      WITH base AS (
        SELECT
          a.id,
          a.user_id,
          a.email,
          a.success,
          a.reason,
          a.ip,
          a.user_agent,
          ${tokenCol} AS token_hint,
          a.created_at,
          u.name AS user_name,
          COALESCE(a.user_id::text, 'e:' || lower(a.email)) AS account_key
        FROM user_login_audits a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE ${whereSql}
      ),
      counts AS (
        SELECT
          account_key,
          COUNT(*)::int AS action_count,
          MIN(created_at) AS first_at,
          MAX(created_at) AS last_at
        FROM base
        GROUP BY account_key
      ),
      latest AS (
        SELECT DISTINCT ON (account_key)
          id, user_id, email, success, reason, ip, user_agent, token_hint,
          created_at, user_name, account_key
        FROM base
        ORDER BY account_key, created_at DESC
      ),
      day_token AS (
        SELECT DISTINCT ON (account_key)
          account_key, token_hint
        FROM base
        WHERE token_hint IS NOT NULL
        ORDER BY account_key, created_at DESC
      )
      SELECT
        l.id AS id,
        l.user_id AS "userId",
        l.email AS email,
        l.user_name AS "userName",
        l.success AS success,
        l.reason AS reason,
        l.ip AS ip,
        l.user_agent AS "userAgent",
        l.token_hint AS "tokenHint",
        COALESCE(l.token_hint, dt.token_hint) AS "dayTokenHint",
        l.created_at AS "createdAt",
        c.first_at AS "firstAt",
        c.last_at AS "lastAt",
        c.action_count AS "actionCount"
      FROM latest l
      JOIN counts c ON c.account_key = l.account_key
      LEFT JOIN day_token dt ON dt.account_key = l.account_key
      ORDER BY c.last_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      params,
    );

    return {
      items: rows.map((row) => {
        const own = hasTokenHint ? ((row.tokenHint as string | null) || null) : null;
        const dayToken = (row.dayTokenHint as string | null) || own;
        return {
          id: row.id,
          userId: row.userId,
          email: row.email,
          userName: row.userName,
          success: row.success === true || row.success === 't' || row.success === 'true',
          reason: row.reason,
          ip: row.ip,
          userAgent: row.userAgent,
          tokenHint: own,
          dayTokenHint: dayToken,
          createdAt: row.createdAt,
          firstAt: row.firstAt,
          lastAt: row.lastAt,
          actionCount: Number(row.actionCount ?? 1),
        };
      }),
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit) || 1),
      day,
      timezone: 'America/Sao_Paulo',
      uniqueAccounts: true,
    };
  }
}
