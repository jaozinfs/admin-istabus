import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  isActiveStatus,
  mapQuotas,
  resolveEffectiveQuotas,
  type QuotaBlock,
} from './quota.util';
import { StripeMetaService } from './stripe-meta.service';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(IbUser) private readonly users: Repository<IbUser>,
    @InjectRepository(IbCompany)
    private readonly companiesRepo: Repository<IbCompany>,
    private readonly stripeMeta: StripeMetaService,
  ) {}

  private async withEffective(
    billing: {
      stripeProductId: string | null;
      stripeSubscriptionStatus: string | null;
    } & Parameters<typeof mapQuotas>[0],
  ) {
    const raw = mapQuotas(billing);
    const active = isActiveStatus(billing.stripeSubscriptionStatus);
    const stripeMeta = active
      ? await this.stripeMeta.getProductMetadata(billing.stripeProductId)
      : null;
    return {
      raw,
      effective: resolveEffectiveQuotas(raw, { active, stripeMeta }),
      planActive: active,
      stripeMetaLoaded: !!stripeMeta,
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
          stripeMetaLoaded: quotas.stripeMetaLoaded,
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
          stripeMetaLoaded: quotas.stripeMetaLoaded,
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
    const quotas = await this.withEffective(billing);
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
      stripeMetaLoaded: quotas.stripeMetaLoaded,
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
      stripeMetaLoaded: quotas.stripeMetaLoaded,
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
