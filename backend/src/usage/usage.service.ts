import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StripeMetaService } from '../accounts/stripe-meta.service';
import {
  isActiveStatus,
  mapQuotas,
  resolveEffectiveQuotas,
} from '../accounts/quota.util';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbWhatsappAudit } from '../entities/ib-whatsapp-audit.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(IbWhatsappAudit)
    private readonly audits: Repository<IbWhatsappAudit>,
    @InjectRepository(IbUser) private readonly users: Repository<IbUser>,
    @InjectRepository(IbCompany)
    private readonly companies: Repository<IbCompany>,
    private readonly stripeMeta: StripeMetaService,
  ) {}

  private dayRange(date?: string) {
    const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(base.getTime())) {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end, day: start.toISOString().slice(0, 10) };
    }
    const start = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, day: start.toISOString().slice(0, 10) };
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
      };
      const n = Number(row.count) || 0;
      cur.total += n;
      cur.byCategory[row.category] = (cur.byCategory[row.category] || 0) + n;
      cur.byStatus[row.status] = (cur.byStatus[row.status] || 0) + n;
      byAccount.set(key, cur);
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
        };
      }),
    );

    return {
      day,
      totalMessages: accounts.reduce((s, a) => s + a.total, 0),
      accounts,
    };
  }

  async topToday(limit = 30) {
    const daily = await this.daily({});
    return {
      day: daily.day,
      top: daily.accounts.slice(0, Math.min(Math.max(limit, 1), 100)),
    };
  }
}
