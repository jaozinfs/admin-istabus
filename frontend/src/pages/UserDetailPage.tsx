import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlanEditor from '../components/PlanEditor';
import QuotaCards from '../components/QuotaCards';
import StripeMetaBadge from '../components/StripeMetaBadge';
import Toast from '../components/Toast';
import { DetailSkeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo, StoredQuotas } from '../lib/types';

type AccessRow = {
  id: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  tokenHint: string | null;
  path: string | null;
  pathLabel: string | null;
  createdAt: string;
};

type Detail = {
  user: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    role: string;
    accountType: string;
    createdAt: string;
  };
  company: {
    id: string;
    name: string;
    members: Array<{ id: string; email: string; role: string; status: string }>;
  } | null;
  effectiveBillingScope: 'user' | 'company';
  plan: PlanInfo;
  quotasStored: StoredQuotas;
  quotasEffective: EffectiveQuotas;
  stripeMeta: {
    status: string;
    ok: boolean;
    keys: Record<string, string>;
    waMetaFromStripe?: string | null;
  };
  activity?: {
    day: string;
    timezone: string;
    location: {
      ip: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      countryCode: string | null;
      isp: string | null;
      label: string | null;
      status: string;
    };
    summary: {
      actionCount: number;
      successCount: number;
      failCount: number;
      firstAt: string | null;
      lastAt: string | null;
    };
    accesses: AccessRow[];
    pages: Array<{
      path: string;
      label: string;
      count: number;
      lastAt: string;
    }>;
  };
};

function formatSp(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

function reasonLabel(reason: string | null): string {
  if (!reason) return '—';
  const map: Record<string, string> = {
    api_activity: 'Uso da API',
    session_issued: 'Login OK',
    mfa_required: 'Desafio MFA',
    mfa_ok: 'MFA OK',
    mfa_bad_code: 'MFA inválido',
    login_verify_required: 'Verificação por e-mail',
    login_verify_ok: 'E-mail verificado',
    bad_password: 'Senha inválida',
    invalid_user: 'Usuário inválido',
    pending_verify: 'E-mail pendente',
    inactive: 'Conta inativa',
  };
  return map[reason] || reason;
}

export default function UserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; kind?: 'ok' | 'error' } | null>(
    null,
  );

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setData(await api<Detail>(`/accounts/users/${id}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (loading && !data) return <DetailSkeleton />;

  if (!data) {
    return (
      <div className="fade-up">
        <Link className="back-link" to="/accounts">
          ← contas
        </Link>
        <p className="error">{error || 'Conta não encontrada'}</p>
      </div>
    );
  }

  const targetId =
    data.effectiveBillingScope === 'company' && data.company
      ? data.company.id
      : data.user.id;
  const activity = data.activity;
  const locationLabel =
    activity?.location.label ||
    (activity?.location.ip ? `IP ${activity.location.ip}` : 'sem localização');

  return (
    <div className="fade-up">
      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}
      <Link className="back-link" to="/accounts">
        ← contas
      </Link>
      <h1 className="page-title">{data.user.email}</h1>
      <p className="page-sub">
        {data.user.name || 'sem nome'} · {data.user.accountType} · {data.user.role} ·{' '}
        {data.user.status}
      </p>

      <div className="toolbar">
        <span className="badge">criada {formatSp(data.user.createdAt)}</span>
        <span className="badge accent">{locationLabel}</span>
        <span className={`badge ${data.plan.active ? 'ok' : 'warn'}`}>
          billing: {data.effectiveBillingScope}
        </span>
        <span className={`badge ${data.plan.active ? 'ok' : ''}`}>
          {data.plan.active ? 'ativo' : 'free'}
        </span>
        <span className="badge accent mono">
          {data.plan.stripeProductId || 'sem product'}
        </span>
        {data.company && (
          <Link className="badge" to={`/companies/${data.company.id}`}>
            empresa: {data.company.name}
          </Link>
        )}
        <StripeMetaBadge meta={data.stripeMeta} />
      </div>

      {activity && (
        <div className="activity-grid">
          <div className="panel">
            <strong>Conta</strong>
            <dl className="meta-dl">
              <div>
                <dt>Criação</dt>
                <dd>{formatSp(data.user.createdAt)}</dd>
              </div>
              <div>
                <dt>Localização</dt>
                <dd>
                  {activity.location.label || '—'}
                  {activity.location.ip ? (
                    <div className="mono muted">{activity.location.ip}</div>
                  ) : null}
                  {activity.location.isp ? (
                    <div className="muted">{activity.location.isp}</div>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Hoje ({activity.day})</dt>
                <dd>
                  {activity.summary.actionCount} eventos ·{' '}
                  {activity.summary.successCount} ok · {activity.summary.failCount}{' '}
                  falha
                  <div className="muted">
                    {activity.summary.firstAt
                      ? `${formatSp(activity.summary.firstAt)} → ${formatSp(activity.summary.lastAt)}`
                      : 'sem acessos hoje'}
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <strong>Páginas / áreas hoje</strong>
            <p className="hint">
              Áreas inferidas pelas rotas de API que a sessão chamou hoje.
            </p>
            {activity.pages.length === 0 ? (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Nenhuma página registrada hoje.
              </p>
            ) : (
              <ul className="member-list">
                {activity.pages.map((p) => (
                  <li key={p.path}>
                    <div>
                      <div>{p.label}</div>
                      <div className="mono muted">{p.path}</div>
                    </div>
                    <span className="badge mono">
                      {p.count}× · {formatSp(p.lastAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel activity-timeline">
            <strong>Acessos do dia</strong>
            <p className="hint">America/Sao_Paulo · até 80 eventos</p>
            {activity.accesses.length === 0 ? (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Sem eventos hoje.
              </p>
            ) : (
              <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Evento</th>
                      <th>Página</th>
                      <th>IP</th>
                      <th>Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.accesses.map((a) => (
                      <tr key={a.id}>
                        <td className="mono">{formatSp(a.createdAt)}</td>
                        <td>
                          <span
                            className={`badge ${a.success ? 'ok' : 'warn'}`}
                          >
                            {reasonLabel(a.reason)}
                          </span>
                        </td>
                        <td>
                          {a.pathLabel || a.path ? (
                            <>
                              <div>{a.pathLabel || '—'}</div>
                              {a.path ? (
                                <div className="mono muted">{a.path}</div>
                              ) : null}
                            </>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="mono">{a.ip || '—'}</td>
                        <td className="mono muted">{a.tokenHint || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="stack" style={{ marginTop: 0 }}>
          <div className="panel">
            <strong>Cotas efetivas</strong>
            <p className="hint">
              Status Stripe: {data.stripeMeta?.status || '—'}
              {data.stripeMeta?.waMetaFromStripe
                ? ` · WA Meta no produto = ${data.stripeMeta.waMetaFromStripe}`
                : ''}
            </p>
            <div style={{ marginTop: '0.85rem' }}>
              <QuotaCards effective={data.quotasEffective} />
            </div>
          </div>
          {data.company && (
            <div className="panel">
              <strong>Subcontas da empresa</strong>
              <ul className="member-list">
                {data.company.members.map((m) => (
                  <li key={m.id}>
                    <Link to={`/accounts/${m.id}`}>{m.email}</Link>
                    <span className="badge">
                      {m.role} · {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <PlanEditor
          scope={data.effectiveBillingScope}
          id={targetId}
          plan={data.plan}
          stored={data.quotasStored}
          onSaved={() => void load()}
          onToast={(msg, kind) => setToast({ msg, kind })}
        />
      </div>
    </div>
  );
}
