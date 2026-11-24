import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbUserLoginAudit } from '../entities/ib-user-login-audit.entity';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { IpGeoService } from './ip-geo.service';
import { labelApiPath } from './page-label.util';
import {
  isActiveStatus,
  mapQuotas,
  resolveEffectiveQuotas,
  type QuotaBlock,
} from './quota.util';
import { StripeMetaService } from './stripe-meta.service';

@Injectable()
export class AccountsService {
  private pathColumnReady: boolean | null = null;

  constructor(
    @InjectRepository(IbUser) private readonly users: Repository<IbUser>,
    @InjectRepository(IbCompany)
    private readonly companiesRepo: Repository<IbCompany>,
    @InjectRepository(IbUserLoginAudit)
    private readonly logins: Repository<IbUserLoginAudit>,
    private readonly stripeMeta: StripeMetaService,
    private readonly ipGeo: IpGeoService,
  ) {}

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

  /** Shared DB: migration InstaBuss pode ainda não ter criado `path`. */
  private async ensurePathColumn(): Promise<boolean> {
    if (this.pathColumnReady != null) return this.pathColumnReady;
    try {
      await this.logins.query(`
        ALTER TABLE "user_login_audits"
        ADD COLUMN IF NOT EXISTS "path" character varying(256)
      `);
      this.pathColumnReady = true;
    } catch {
      try {
        const rows: Array<{ exists: boolean }> = await this.logins.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'user_login_audits'
              AND column_name = 'path'
          ) AS "exists"
        `);
        this.pathColumnReady = Boolean(rows?.[0]?.exists);
      } catch {
        this.pathColumnReady = false;
      }
    }
    return this.pathColumnReady;
  }

  private async loadUserActivity(userId: string, email: string) {
    const { start, end, day, timezone } = this.dayRange();
    const hasPath = await this.ensurePathColumn();

    let accesses: Array<{
      id: string;
      success: boolean;
      reason: string | null;
      ip: string | null;
      userAgent: string | null;
      tokenHint: string | null;
      path: string | null;
      createdAt: Date;
    }> = [];

    try {
      const pathSelect = hasPath ? 'a.path AS path' : 'NULL::varchar AS path';
      const rows: Array<Record<string, unknown>> = await this.logins.query(
        `
        SELECT
          a.id AS id,
          a.success AS success,
          a.reason AS reason,
          a.ip AS ip,
          a.user_agent AS "userAgent",
          a.token_hint AS "tokenHint",
          ${pathSelect},
          a.created_at AS "createdAt"
        FROM user_login_audits a
        WHERE a.created_at >= $1 AND a.created_at < $2
          AND (a.user_id = $3 OR lower(a.email) = lower($4))
        ORDER BY a.created_at DESC
        LIMIT 80
        `,
        [start, end, userId, email],
      );
      accesses = rows.map((row) => ({
        id: String(row.id),
        success:
          row.success === true ||
          row.success === 't' ||
          row.success === 'true',
        reason: (row.reason as string | null) ?? null,
        ip: (row.ip as string | null) ?? null,
        userAgent: (row.userAgent as string | null) ?? null,
        tokenHint: (row.tokenHint as string | null) ?? null,
        path: (row.path as string | null) ?? null,
        createdAt: row.createdAt as Date,
      }));
    } catch {
      accesses = [];
    }

    let pages: Array<{
      path: string;
      label: string;
      count: number;
      lastAt: Date;
    }> = [];
    if (hasPath) {
      try {
        const pageRows: Array<Record<string, unknown>> = await this.logins.query(
          `
          SELECT
            a.path AS path,
            COUNT(*)::int AS count,
            MAX(a.created_at) AS "lastAt"
          FROM user_login_audits a
          WHERE a.created_at >= $1 AND a.created_at < $2
            AND (a.user_id = $3 OR lower(a.email) = lower($4))
            AND a.path IS NOT NULL
            AND length(trim(a.path)) > 0
          GROUP BY a.path
          ORDER BY MAX(a.created_at) DESC
          LIMIT 40
          `,
          [start, end, userId, email],
        );
        pages = pageRows.map((row) => {
          const path = String(row.path || '');
          return {
            path,
            label: labelApiPath(path),
            count: Number(row.count ?? 0),
            lastAt: row.lastAt as Date,
          };
        });
      } catch {
        pages = [];
      }
    }

    const latestIp =
      accesses.find((a) => a.ip)?.ip ??
      (
        await this.logins
          .createQueryBuilder('a')
          .select('a.ip', 'ip')
          .where('a.user_id = :userId OR lower(a.email) = lower(:email)', {
            userId,
            email,
          })
          .andWhere('a.ip IS NOT NULL')
          .orderBy('a.created_at', 'DESC')
          .limit(1)
          .getRawOne<{ ip: string | null }>()
          .catch(() => null)
      )?.ip ??
      null;

    const geoLookup = await this.ipGeo.lookup(latestIp);
    const successCount = accesses.filter((a) => a.success).length;
    const failCount = accesses.length - successCount;
    const firstAt =
      accesses.length > 0
        ? accesses.reduce(
            (min, a) => (a.createdAt < min ? a.createdAt : min),
            accesses[0].createdAt,
          )
        : null;
    const lastAt = accesses[0]?.createdAt ?? null;

    return {
      day,
      timezone,
      location: {
        ip: latestIp,
        ...(geoLookup.geo ?? {
          city: null,
          region: null,
          country: null,
          countryCode: null,
          isp: null,
          label: null,
        }),
        status: geoLookup.status,
      },
      summary: {
        actionCount: accesses.length,
        successCount,
        failCount,
        firstAt,
        lastAt,
      },
      accesses: accesses.map((a) => ({
        ...a,
        pathLabel: a.path ? labelApiPath(a.path) : null,
      })),
      pages,
    };
  }

  private async withEffective(
    billing: {
      stripeProductId: string | null;
      stripeSubscriptionStatus: string | null;
    } & Parameters<typeof mapQuotas>[0],
  ) {
    const raw = mapQuotas(billing);
    const active = isActiveStatus(billing.stripeSubscriptionStatus);
    const stripe = active
      ? await this.stripeMeta.getProductMetadata(billing.stripeProductId)
      : {
          ok: false,
          status: 'no_product' as const,
          meta: {} as Record<string, string>,
        };
    return {
      raw,
      effective: resolveEffectiveQuotas(raw, {
        active,
        stripeMeta:
          Object.keys(stripe.meta).length > 0 ? stripe.meta : null,
      }),
      planActive: active,
      stripeMeta: {
        status: active ? stripe.status : 'skipped_inactive',
        ok: stripe.ok,
        keys: stripe.meta,
        waMetaFromStripe: stripe.meta.cota_whatsapp_disparo_meta ?? null,
      },
    };
  }

  async overview(q?: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.company', 'c')
      .orderBy('u.createdAt', 'DESC')
      .take(500);
    if (q?.trim()) {
      qb.andWhere(
        '(u.email ILIKE :q OR u.name ILIKE :q OR c.name ILIKE :q)',
        { q: `%${q.trim()}%` },
      );
    }
    const rows = await qb.getMany();
    return Promise.all(
      rows.map(async (u) => {
        const billing = u.company ?? u;
        const quotas = await this.withEffective(billing);
        return {
          userId: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          role: u.role,
          accountType: u.accountType,
          createdAt: u.createdAt,
          company: u.company
            ? { id: u.company.id, name: u.company.name }
            : null,
          plan: {
            stripeProductId: billing.stripeProductId,
            stripeSubscriptionStatus: billing.stripeSubscriptionStatus,
            stripePriceId: billing.stripePriceId,
            stripeSubscriptionId: billing.stripeSubscriptionId,
            scope: u.company ? 'company' : 'user',
            active: quotas.planActive,
          },
          quotasStored: quotas.raw,
          quotasEffective: quotas.effective,
          stripeMeta: quotas.stripeMeta,
        };
      }),
    );
  }

  async listCompanies(q?: string) {
    const qb = this.companiesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.users', 'u')
      .orderBy('c.createdAt', 'DESC')
      .take(300);
    if (q?.trim()) {
      qb.andWhere('c.name ILIKE :q', { q: `%${q.trim()}%` });
    }
    const rows = await qb.getMany();
    return Promise.all(
      rows.map(async (c) => {
        const quotas = await this.withEffective(c);
        return {
          id: c.id,
          name: c.name,
          createdAt: c.createdAt,
          plan: {
            stripeProductId: c.stripeProductId,
            stripeSubscriptionStatus: c.stripeSubscriptionStatus,
            stripePriceId: c.stripePriceId,
            stripeSubscriptionId: c.stripeSubscriptionId,
            stripeCustomerId: c.stripeCustomerId,
            active: quotas.planActive,
          },
          quotasStored: quotas.raw,
          quotasEffective: quotas.effective,
          stripeMeta: quotas.stripeMeta,
          members: (c.users || []).map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            status: u.status,
            accountType: u.accountType,
            createdAt: u.createdAt,
          })),
        };
      }),
    );
  }

  async userDetail(userId: string) {
    const u = await this.users.findOne({
      where: { id: userId },
      relations: ['company', 'company.users'],
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    const billing = u.company ?? u;
    const [quotas, activity] = await Promise.all([
      this.withEffective(billing),
      this.loadUserActivity(u.id, u.email),
    ]);
    return {
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        role: u.role,
        accountType: u.accountType,
        createdAt: u.createdAt,
      },
      company: u.company
        ? {
            id: u.company.id,
            name: u.company.name,
            createdAt: u.company.createdAt,
            members: (u.company.users || []).map((m) => ({
              id: m.id,
              email: m.email,
              name: m.name,
              role: m.role,
              status: m.status,
            })),
          }
        : null,
      effectiveBillingScope: u.company ? ('company' as const) : ('user' as const),
      plan: {
        stripeProductId: billing.stripeProductId,
        stripeSubscriptionStatus: billing.stripeSubscriptionStatus,
        stripePriceId: billing.stripePriceId,
        stripeSubscriptionId: billing.stripeSubscriptionId,
        stripeCustomerId: billing.stripeCustomerId,
        active: quotas.planActive,
      },
      quotasStored: quotas.raw,
      quotasEffective: quotas.effective,
      stripeMeta: quotas.stripeMeta,
      activity,
    };
  }

  async companyDetail(companyId: string) {
    const c = await this.companiesRepo.findOne({
      where: { id: companyId },
      relations: ['users'],
    });
    if (!c) throw new NotFoundException('Empresa não encontrada');
    const quotas = await this.withEffective(c);
    return {
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      plan: {
        stripeProductId: c.stripeProductId,
        stripeSubscriptionStatus: c.stripeSubscriptionStatus,
        stripePriceId: c.stripePriceId,
        stripeSubscriptionId: c.stripeSubscriptionId,
        stripeCustomerId: c.stripeCustomerId,
        active: quotas.planActive,
      },
      quotasStored: quotas.raw as QuotaBlock,
      quotasEffective: quotas.effective,
      stripeMeta: quotas.stripeMeta,
      members: (c.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        accountType: u.accountType,
        createdAt: u.createdAt,
      })),
    };
  }

  async updatePlan(dto: UpdatePlanDto) {
    const patch: Record<string, unknown> = {};
    const keys: (keyof UpdatePlanDto)[] = [
      'stripeProductId',
      'stripePriceId',
      'stripeSubscriptionId',
      'stripeSubscriptionStatus',
      'quotaWhatsappBroadcastMetaLimit',
      'quotaWhatsappBroadcastBaileysLimit',
      'quotaWhatsappGroupBaileysLimit',
      'quotaFeedLimit',
      'quotaStoryLimit',
      'quotaGeniaLimit',
    ];
    for (const k of keys) {
      if (k === 'confirmPassword') continue;
      if (dto[k] !== undefined) patch[k] = dto[k];
    }
    if (
      dto.stripeSubscriptionStatus === 'active' &&
      patch.stripeSubscriptionId === undefined
    ) {
      // keep existing unless explicitly cleared; only set manual if missing later
    }
    if (dto.stripeSubscriptionStatus === 'active') {
      if (dto.scope === 'company') {
        const cur = await this.companiesRepo.findOne({
          where: { id: dto.id },
          select: ['id', 'stripeSubscriptionId'],
        });
        if (cur && !cur.stripeSubscriptionId && dto.stripeSubscriptionId === undefined) {
          patch.stripeSubscriptionId = 'sub_admin_manual';
        }
      } else {
        const cur = await this.users.findOne({
          where: { id: dto.id },
          select: ['id', 'stripeSubscriptionId'],
        });
        if (cur && !cur.stripeSubscriptionId && dto.stripeSubscriptionId === undefined) {
          patch.stripeSubscriptionId = 'sub_admin_manual';
        }
      }
    }

    if (dto.scope === 'company') {
      const exists = await this.companiesRepo.exist({ where: { id: dto.id } });
      if (!exists) throw new NotFoundException('Empresa não encontrada');
      await this.companiesRepo.update({ id: dto.id }, patch);
      return this.companyDetail(dto.id);
    }
    const exists = await this.users.exist({ where: { id: dto.id } });
    if (!exists) throw new NotFoundException('Usuário não encontrado');
    await this.users.update({ id: dto.id }, patch);
    return this.userDetail(dto.id);
  }

  async stats() {
    const [users, companies, paidCompanies, paidUsers] = await Promise.all([
      this.users.count(),
      this.companiesRepo.count(),
      this.companiesRepo.count({
        where: { stripeSubscriptionStatus: 'active' },
      }),
      this.users.count({
        where: {
          companyId: IsNull(),
          stripeSubscriptionStatus: 'active',
        },
      }),
    ]);
    return {
      users,
      companies,
      activePaidCompanies: paidCompanies,
      activePaidPersonalUsers: paidUsers,
      activePaidTotal: paidCompanies + paidUsers,
      freeDefaultsHint: {
        note: 'null no banco = free ou metadata Stripe (se STRIPE_SECRET_KEY)',
      },
    };
  }

  async distinctProducts() {
    const [c, u] = await Promise.all([
      this.companiesRepo.find({
        select: ['stripeProductId'],
        where: { stripeProductId: Not(IsNull()) },
      }),
      this.users.find({
        select: ['stripeProductId'],
        where: { stripeProductId: Not(IsNull()) },
      }),
    ]);
    const set = new Set<string>();
    for (const row of [...c, ...u]) {
      if (row.stripeProductId) set.add(row.stripeProductId);
    }
    return [...set].sort();
  }
}
