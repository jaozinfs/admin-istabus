import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlanEditor from '../components/PlanEditor';
import QuotaCards from '../components/QuotaCards';
import StripeMetaBadge from '../components/StripeMetaBadge';
import Toast from '../components/Toast';
import { DetailSkeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo, StoredQuotas } from '../lib/types';

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
};

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
