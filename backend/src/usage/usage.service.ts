import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StripeMetaService } from '../accounts/stripe-meta.service';
import {
  isActiveStatus,
  mapQuotas,
  resolveEffectiveQuotas,
} from '../accounts/quota.util';
import { IbCompany } from '../entities/ib-company.entity';
import { IbPost } from '../entities/ib-post.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbWhatsappAudit } from '../entities/ib-whatsapp-audit.entity';
import { IbWhatsappScheduled } from '../entities/ib-whatsapp-scheduled.entity';

const IN_PROGRESS = new Set([
  'preparing',
  'queued',
  'processing',
  'paused',
  'partial',
]);

/** Aceitas pela Meta / em voo / concluídas (funil “enviadas”). */
const SENT_STATUSES = [
  'held',
  'accepted',
  'sent',
  'delivered',
  'read',
  'played',
] as const;

/** Confirmação de entrega no aparelho (webhook). */
const DELIVERED_STATUSES = ['delivered', 'read', 'played'] as const;

const PAUSEABLE_BROADCAST = [
  'preparing',
  'queued',
  'processing',
  'partial',
] as const;

const ADMIN_MANUAL_PAUSE_REASON = 'admin_manual';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(IbWhatsappAudit)
    private readonly audits: Repository<IbWhatsappAudit>,
    @InjectRepository(IbWhatsappScheduled)
    private readonly scheduled: Repository<IbWhatsappScheduled>,
    @InjectRepository(IbPost) private readonly posts: Repository<IbPost>,
    @InjectRepository(IbUser) private readonly users: Repository<IbUser>,
    @InjectRepository(IbCompany)
    private readonly companies: Repository<IbCompany>,
    private readonly stripeMeta: StripeMetaService,
  ) {}

  /**
   * Dia civil America/Sao_Paulo (UTC-3 o ano todo desde 2019).
   * Antes usava meia-noite UTC — “hoje” no BR puxava ontem à noite.
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

  async daily(params: {
    date?: string;
    companyId?: string;
    userId?: string;
  }) {
    const { start, end, day } = this.dayRange(params.date);
    const qb = this.audits
      .createQueryBuilder('a')
      .select('a.companyId', 'companyId')
      .addSelect('a.userId', 'userId')
      .addSelect('a.category', 'category')
      .addSelect('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('COALESCE(a.sentAt, a.createdAt) >= :start', { start })
      .andWhere('COALESCE(a.sentAt, a.createdAt) < :end', { end })
      .groupBy('a.companyId')
      .addGroupBy('a.userId')
      .addGroupBy('a.category')
      .addGroupBy('a.status')
      .orderBy('count', 'DESC');

    if (params.companyId) {
      qb.andWhere('a.companyId = :companyId', {
        companyId: params.companyId,
      });
    }
    if (params.userId) {
      qb.andWhere('a.userId = :userId', { userId: params.userId });
    }

    const rows = await qb.getRawMany<{
      companyId: string | null;
      userId: string;
      category: string;
      status: string;
      count: string;
    }>();

    const byAccount = new Map<
      string,
      {
        companyId: string | null;
        userId: string;
        total: number;
        byCategory: Record<string, number>;
        byStatus: Record<string, number>;
        sent: number;
        deliveredAll: number;
        delivered: number;
        deliveredLivedata: number;
      }
    >();

    for (const row of rows) {
      const key = `${row.companyId || 'none'}::${row.userId}`;
      const cur = byAccount.get(key) || {
        companyId: row.companyId,
        userId: row.userId,
        total: 0,
        byCategory: {},
        byStatus: {},
        sent: 0,
        deliveredAll: 0,
        delivered: 0,
        deliveredLivedata: 0,
      };
      const n = Number(row.count) || 0;
      cur.total += n;
      cur.byCategory[row.category] = (cur.byCategory[row.category] || 0) + n;
      cur.byStatus[row.status] = (cur.byStatus[row.status] || 0) + n;
      byAccount.set(key, cur);
    }

    const funnelQb = this.audits
      .createQueryBuilder('a')
      .leftJoin(
        IbWhatsappScheduled,
        's',
        's.id = a.scheduledMessageId',
      )
      .select('a.companyId', 'companyId')
      .addSelect('a.userId', 'userId')
      .addSelect(
        `COUNT(*) FILTER (WHERE a.status IN (:...sentStatuses))`,
        'sent',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE a.status IN (:...deliveredStatuses))`,
        'deliveredAll',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE a.status IN (:...deliveredStatuses) AND s.livedataTriggerId IS NULL)`,
        'delivered',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE a.status IN (:...deliveredStatuses) AND s.livedataTriggerId IS NOT NULL)`,
        'deliveredLivedata',
      )
      .where('COALESCE(a.sentAt, a.createdAt) >= :start', { start })
      .andWhere('COALESCE(a.sentAt, a.createdAt) < :end', { end })
      .setParameters({
        sentStatuses: [...SENT_STATUSES],
        deliveredStatuses: [...DELIVERED_STATUSES],
      })
      .groupBy('a.companyId')
      .addGroupBy('a.userId');
    if (params.companyId) {
      funnelQb.andWhere('a.companyId = :companyId', {
        companyId: params.companyId,
      });
    }
    if (params.userId) {
      funnelQb.andWhere('a.userId = :userId', { userId: params.userId });
    }
    const funnelRows = await funnelQb.getRawMany<{
      companyId: string | null;
      userId: string;
      sent: string;
      deliveredAll: string;
      delivered: string;
      deliveredLivedata: string;
    }>();

    for (const row of funnelRows) {
      const key = `${row.companyId || 'none'}::${row.userId}`;
      const cur = byAccount.get(key);
      if (!cur) continue;
      cur.sent = Number(row.sent) || 0;
      cur.deliveredAll = Number(row.deliveredAll) || 0;
      cur.delivered = Number(row.delivered) || 0;
      cur.deliveredLivedata = Number(row.deliveredLivedata) || 0;
    }

    const baseAccounts = [...byAccount.values()].sort(
      (a, b) => b.total - a.total,
    );
    const userIds = [...new Set(baseAccounts.map((a) => a.userId))];
    const companyIds = [
      ...new Set(
        baseAccounts.map((a) => a.companyId).filter((x): x is string => !!x),
      ),
    ];

    const [users, companies] = await Promise.all([
      userIds.length
        ? this.users.find({ where: { id: In(userIds) } })
        : Promise.resolve([] as IbUser[]),
      companyIds.length
        ? this.companies.find({ where: { id: In(companyIds) } })
        : Promise.resolve([] as IbCompany[]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const accounts = await Promise.all(
      baseAccounts.map(async (row) => {
        const user = userMap.get(row.userId);
        const company = row.companyId ? companyMap.get(row.companyId) : null;
        const billing = company ?? user ?? null;
        let quotasEffective = null as ReturnType<
          typeof resolveEffectiveQuotas
        > | null;
        let planActive = false;
        if (billing) {
          const raw = mapQuotas(billing);
          planActive = isActiveStatus(billing.stripeSubscriptionStatus);
          const stripeRes = planActive
            ? await this.stripeMeta.getProductMetadata(billing.stripeProductId)
            : null;
          quotasEffective = resolveEffectiveQuotas(raw, {
            active: planActive,
            stripeMeta:
              stripeRes && Object.keys(stripeRes.meta).length > 0
                ? stripeRes.meta
                : null,
          });
        }
        const metaUsed = row.byCategory.meta_broadcast || 0;
        const metaLimit = quotasEffective?.whatsappBroadcastMetaLimit ?? null;
        return {
          ...row,
          userName: user?.name || null,
          userEmail: user?.email || null,
          companyName: company?.name || null,
          planActive,
          stripeProductId: billing?.stripeProductId ?? null,
          quotasEffective,
          metaUsed,
          metaLimit,
          metaPct:
            metaLimit && metaLimit > 0
              ? Math.round((metaUsed / metaLimit) * 100)
              : null,
          funnel: {
            sent: row.sent,
            deliveredAll: row.deliveredAll,
            delivered: row.delivered,
            deliveredLivedata: row.deliveredLivedata,
          },
        };
      }),
    );

    return {
      day,
      totalMessages: accounts.reduce((s, a) => s + a.total, 0),
      totals: {
        sent: accounts.reduce((s, a) => s + a.funnel.sent, 0),
        deliveredAll: accounts.reduce((s, a) => s + a.funnel.deliveredAll, 0),
        delivered: accounts.reduce((s, a) => s + a.funnel.delivered, 0),
        deliveredLivedata: accounts.reduce(
          (s, a) => s + a.funnel.deliveredLivedata,
          0,
        ),
      },
      accounts,
    };
  }

  /**
   * Para todos os disparos ativos da conta (empresa ou pessoal).
   * Espelha o pause manual do InstaBuss: worker/broker respeitam `broadcast_status=paused`.
   */
  async pauseAccount(params: { userId: string; companyId?: string | null }) {
    const userId = params.userId?.trim();
    if (!userId) throw new NotFoundException('userId obrigatório');
    const companyId = params.companyId?.trim() || null;

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Conta não encontrada');

    const now = new Date();
    const ownerClause = companyId
      ? 'company_id = :companyId'
      : 'user_id = :userId AND company_id IS NULL';
    const ownerParams = { userId, companyId };

    const preparing = await this.scheduled
      .createQueryBuilder()
      .update(IbWhatsappScheduled)
      .set({
        broadcastStatus: 'cancelled',
        status: 'cancelled',
        errorMessage: 'Cancelado pelo admin (parar conta)',
      })
      .where(ownerClause, ownerParams)
      .andWhere('broadcast_status = :preparing', { preparing: 'preparing' })
      .execute();

    const paused = await this.scheduled
      .createQueryBuilder()
      .update(IbWhatsappScheduled)
      .set({
        broadcastStatus: 'paused',
        broadcastPausedAt: now,
        broadcastHeldPauseReason: ADMIN_MANUAL_PAUSE_REASON,
      })
      .where(ownerClause, ownerParams)
      .andWhere('broadcast_status IN (:...statuses)', {
        statuses: [...PAUSEABLE_BROADCAST].filter((s) => s !== 'preparing'),
      })
      .execute();

    return {
      userId,
      companyId,
      scope: companyId ? ('company' as const) : ('personal' as const),
      cancelledPreparing: preparing.affected ?? 0,
      paused: paused.affected ?? 0,
      totalStopped: (preparing.affected ?? 0) + (paused.affected ?? 0),
      at: now.toISOString(),
    };
  }

  async topToday(limit = 30) {
    const daily = await this.daily({});
    return {
      day: daily.day,
      top: daily.accounts.slice(0, Math.min(Math.max(limit, 1), 100)),
    };
  }

  private monthRange(month?: string): {
    start: Date | null;
    end: Date | null;
    month: string | null;
  } {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return { start: null, end: null, month: null };
    }
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return { start, end, month };
  }

  async companyReport(companyId: string, month?: string) {
    const company = await this.companies.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const { start, end, month: monthKey } = this.monthRange(month);
    const scope = monthKey ? 'month' : 'lifetime';

    const schedQb = this.scheduled
      .createQueryBuilder('s')
      .where('s.companyId = :companyId', { companyId });
    const auditQb = this.audits
      .createQueryBuilder('a')
      .where('a.companyId = :companyId', { companyId });
    const postQb = this.posts
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId });

    if (start && end) {
      schedQb
        .andWhere('COALESCE(s.sentAt, s.scheduledAt, s.createdAt) >= :start', {
          start,
        })
        .andWhere('COALESCE(s.sentAt, s.scheduledAt, s.createdAt) < :end', {
          end,
        });
      auditQb
        .andWhere('COALESCE(a.sentAt, a.createdAt) >= :start', { start })
        .andWhere('COALESCE(a.sentAt, a.createdAt) < :end', { end });
      postQb
        .andWhere('COALESCE(p.postedAt, p.createdAt) >= :start', { start })
        .andWhere('COALESCE(p.postedAt, p.createdAt) < :end', { end });
    }

    const [
      dispatches,
      quantityRow,
      statusRows,
      messages,
      categoryRows,
      postsTotal,
      postTypeRows,
    ] = await Promise.all([
      schedQb.getCount(),
      this.scheduled
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.broadcastTotal), 0)', 'quantitySum')
        .addSelect('COALESCE(SUM(s.broadcastAccepted), 0)', 'acceptedSum')
        .addSelect('COALESCE(SUM(s.broadcastFailed), 0)', 'failedSum')
        .addSelect('COALESCE(SUM(s.broadcastDelivered), 0)', 'deliveredSum')
        .addSelect('COALESCE(SUM(s.broadcastPending), 0)', 'pendingSum')
        .where('s.companyId = :companyId', { companyId })
        .andWhere(
          start && end
            ? 'COALESCE(s.sentAt, s.scheduledAt, s.createdAt) >= :start AND COALESCE(s.sentAt, s.scheduledAt, s.createdAt) < :end'
            : '1=1',
          start && end ? { start, end } : {},
        )
        .getRawOne<{
          quantitySum: string;
          acceptedSum: string;
          failedSum: string;
          deliveredSum: string;
          pendingSum: string;
        }>(),
      this.scheduled
        .createQueryBuilder('s')
        .select('COALESCE(s.broadcastStatus, s.status)', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('s.companyId = :companyId', { companyId })
        .andWhere(
          start && end
            ? 'COALESCE(s.sentAt, s.scheduledAt, s.createdAt) >= :start AND COALESCE(s.sentAt, s.scheduledAt, s.createdAt) < :end'
            : '1=1',
          start && end ? { start, end } : {},
        )
        .groupBy('COALESCE(s.broadcastStatus, s.status)')
        .getRawMany<{ status: string; count: string }>(),
      auditQb.getCount(),
      this.audits
        .createQueryBuilder('a')
        .select('a.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('a.companyId = :companyId', { companyId })
        .andWhere(
          start && end
            ? 'COALESCE(a.sentAt, a.createdAt) >= :start AND COALESCE(a.sentAt, a.createdAt) < :end'
            : '1=1',
          start && end ? { start, end } : {},
        )
        .groupBy('a.category')
        .getRawMany<{ category: string; count: string }>(),
      postQb.getCount(),
      this.posts
        .createQueryBuilder('p')
        .select('p.postType', 'postType')
        .addSelect('COUNT(*)', 'count')
        .where('p.companyId = :companyId', { companyId })
        .andWhere(
          start && end
            ? 'COALESCE(p.postedAt, p.createdAt) >= :start AND COALESCE(p.postedAt, p.createdAt) < :end'
            : '1=1',
          start && end ? { start, end } : {},
        )
        .groupBy('p.postType')
        .getRawMany<{ postType: string; count: string }>(),
    ]);

    const byBroadcastStatus: Record<string, number> = {};
    for (const r of statusRows) {
      byBroadcastStatus[r.status || 'unknown'] = Number(r.count) || 0;
    }
    const byCategory: Record<string, number> = {};
    for (const r of categoryRows) {
      byCategory[r.category || 'unknown'] = Number(r.count) || 0;
    }
    const postsByType: Record<string, number> = {};
    for (const r of postTypeRows) {
      postsByType[r.postType || 'unknown'] = Number(r.count) || 0;
    }

    let monthlyBreakdown: Array<{
      month: string;
      dispatches: number;
      messages: number;
      quantitySum: number;
    }> = [];

    if (!monthKey) {
      const monthly = await this.scheduled
        .createQueryBuilder('s')
        .select(`to_char(date_trunc('month', COALESCE(s.sent_at, s.scheduled_at, s.created_at)), 'YYYY-MM')`, 'month')
        .addSelect('COUNT(*)', 'dispatches')
        .addSelect('COALESCE(SUM(s.broadcast_total), 0)', 'quantitySum')
        .where('s.company_id = :companyId', { companyId })
        .groupBy(`date_trunc('month', COALESCE(s.sent_at, s.scheduled_at, s.created_at))`)
        .orderBy(`date_trunc('month', COALESCE(s.sent_at, s.scheduled_at, s.created_at))`, 'DESC')
        .limit(24)
        .getRawMany<{
          month: string;
          dispatches: string;
          quantitySum: string;
        }>();

      const monthlyMsg = await this.audits
        .createQueryBuilder('a')
        .select(`to_char(date_trunc('month', COALESCE(a.sent_at, a.created_at)), 'YYYY-MM')`, 'month')
        .addSelect('COUNT(*)', 'messages')
        .where('a.company_id = :companyId', { companyId })
        .groupBy(`date_trunc('month', COALESCE(a.sent_at, a.created_at))`)
        .getRawMany<{ month: string; messages: string }>();

      const msgMap = new Map(
        monthlyMsg.map((m) => [m.month, Number(m.messages) || 0]),
      );
      monthlyBreakdown = monthly.map((m) => ({
        month: m.month,
        dispatches: Number(m.dispatches) || 0,
        messages: msgMap.get(m.month) || 0,
        quantitySum: Number(m.quantitySum) || 0,
      }));
    }

    const inProgress = Object.entries(byBroadcastStatus)
      .filter(([k]) => IN_PROGRESS.has(k))
      .reduce((s, [, n]) => s + n, 0);

    return {
      companyId: company.id,
      companyName: company.name,
      scope,
      month: monthKey,
      whatsapp: {
        dispatches,
        messages,
        quantitySum: Number(quantityRow?.quantitySum || 0),
        acceptedSum: Number(quantityRow?.acceptedSum || 0),
        failedSum: Number(quantityRow?.failedSum || 0),
        deliveredSum: Number(quantityRow?.deliveredSum || 0),
        pendingSum: Number(quantityRow?.pendingSum || 0),
        inProgressDispatches: inProgress,
        byCategory,
        byBroadcastStatus,
      },
      posts: {
        total: postsTotal,
        byType: postsByType,
      },
      monthlyBreakdown,
    };
  }

  async dispatches(params: {
    date?: string;
    userId?: string;
    companyId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { start, end, day } = this.dayRange(params.date);
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(params.pageSize) || 20));

    const qb = this.scheduled
      .createQueryBuilder('s')
      .where('COALESCE(s.sentAt, s.scheduledAt, s.createdAt) >= :start', {
        start,
      })
      .andWhere('COALESCE(s.sentAt, s.scheduledAt, s.createdAt) < :end', {
        end,
      })
      .orderBy('COALESCE(s.sentAt, s.scheduledAt, s.createdAt)', 'DESC');

    if (params.userId) {
      qb.andWhere('s.userId = :userId', { userId: params.userId });
    }
    if (params.companyId) {
      qb.andWhere('s.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const companyIds = [
      ...new Set(rows.map((r) => r.companyId).filter((x): x is string => !!x)),
    ];
    const [users, companies] = await Promise.all([
      userIds.length
        ? this.users.find({ where: { id: In(userIds) } })
        : Promise.resolve([] as IbUser[]),
      companyIds.length
        ? this.companies.find({ where: { id: In(companyIds) } })
        : Promise.resolve([] as IbCompany[]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const items = rows.map((s) => {
      const user = userMap.get(s.userId);
      const company = s.companyId ? companyMap.get(s.companyId) : null;
      const broadcastStatus = s.broadcastStatus;
      const inProgress =
        !!broadcastStatus && IN_PROGRESS.has(broadcastStatus);
      const name =
        s.broadcastTag ||
        s.targetGroupName ||
        (s.message ? s.message.slice(0, 80) : 'Disparo');
      const when = s.sentAt || s.scheduledAt || s.createdAt;
      return {
        id: s.id,
        senderName: user?.name || null,
        senderEmail: user?.email || null,
        companyName: company?.name || null,
        companyId: s.companyId,
        userId: s.userId,
        name,
        targetType: s.targetType,
        provider: s.provider,
        tag: s.broadcastTag,
        date: when?.toISOString() ?? null,
        quantity: s.broadcastTotal || 0,
        processed: s.broadcastProcessed || 0,
        accepted: s.broadcastAccepted || 0,
        failed: s.broadcastFailed || 0,
        pending: s.broadcastPending || 0,
        delivered: s.broadcastDelivered || 0,
        held: s.broadcastHeld || 0,
        status: s.status,
        broadcastStatus,
        inProgress,
        progressPct:
          s.broadcastTotal > 0
            ? Math.round(
                ((s.broadcastProcessed || 0) / s.broadcastTotal) * 100,
              )
            : null,
        errorMessage: s.errorMessage,
      };
    });

    return {
      day,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    };
  }
}

