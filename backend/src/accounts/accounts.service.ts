import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { mapQuotas } from './quota.util';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(IbUser) private readonly users: Repository<IbUser>,
    @InjectRepository(IbCompany)
    private readonly companiesRepo: Repository<IbCompany>,
  ) {}

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
    return rows.map((u) => {
      const billing = u.company ?? u;
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
        },
        quotas: mapQuotas(billing),
      };
    });
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
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      plan: {
        stripeProductId: c.stripeProductId,
        stripeSubscriptionStatus: c.stripeSubscriptionStatus,
        stripePriceId: c.stripePriceId,
        stripeSubscriptionId: c.stripeSubscriptionId,
        stripeCustomerId: c.stripeCustomerId,
      },
      quotas: mapQuotas(c),
      members: (c.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        accountType: u.accountType,
        createdAt: u.createdAt,
      })),
    }));
  }

  async userDetail(userId: string) {
    const u = await this.users.findOne({
      where: { id: userId },
      relations: ['company', 'company.users'],
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    const billing = u.company ?? u;
    return {
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        role: u.role,
        accountType: u.accountType,
        createdAt: u.createdAt,
        personalPlan: {
          stripeProductId: u.stripeProductId,
          stripeSubscriptionStatus: u.stripeSubscriptionStatus,
        },
        personalQuotas: mapQuotas(u),
      },
      company: u.company
        ? {
            id: u.company.id,
            name: u.company.name,
            createdAt: u.company.createdAt,
            plan: {
              stripeProductId: u.company.stripeProductId,
              stripeSubscriptionStatus: u.company.stripeSubscriptionStatus,
              stripePriceId: u.company.stripePriceId,
              stripeSubscriptionId: u.company.stripeSubscriptionId,
              stripeCustomerId: u.company.stripeCustomerId,
            },
            quotas: mapQuotas(u.company),
            members: (u.company.users || []).map((m) => ({
              id: m.id,
              email: m.email,
              name: m.name,
              role: m.role,
              status: m.status,
            })),
          }
        : null,
      effectiveBillingScope: u.company ? 'company' : 'user',
      effectivePlan: {
        stripeProductId: billing.stripeProductId,
        stripeSubscriptionStatus: billing.stripeSubscriptionStatus,
        stripePriceId: billing.stripePriceId,
        stripeSubscriptionId: billing.stripeSubscriptionId,
      },
      effectiveQuotas: mapQuotas(billing),
    };
  }

  async companyDetail(companyId: string) {
    const c = await this.companiesRepo.findOne({
      where: { id: companyId },
      relations: ['users'],
    });
    if (!c) throw new NotFoundException('Empresa não encontrada');
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
      },
      quotas: mapQuotas(c),
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
      if (dto[k] !== undefined) patch[k] = dto[k];
    }
    if (dto.stripeSubscriptionStatus === 'active' && !patch.stripeSubscriptionId) {
      patch.stripeSubscriptionId = 'sub_admin_manual';
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
