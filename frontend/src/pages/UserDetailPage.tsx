import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlanEditor from '../components/PlanEditor';
import { api } from '../lib/api';

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
    plan: {
      stripeProductId: string | null;
      stripeSubscriptionStatus: string | null;
      stripePriceId: string | null;
    };
    quotas: Record<string, number | string | null>;
    members: Array<{ id: string; email: string; role: string }>;
  } | null;
  effectiveBillingScope: 'user' | 'company';
  effectivePlan: {
    stripeProductId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId: string | null;
  };
  effectiveQuotas: Record<string, number | string | null>;
};

export default function UserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    try {
      setData(await api<Detail>(`/accounts/users/${id}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!data) return <p className="muted">{error || 'carregando…'}</p>;

  const scope = data.effectiveBillingScope;
  const targetId = scope === 'company' && data.company ? data.company.id : data.user.id;

  return (
    <div>
      <p className="muted">
        <Link to="/accounts">← contas</Link>
      </p>
      <h2 style={{ marginTop: 0 }}>{data.user.email}</h2>
      <p className="muted">
        {data.user.name || '—'} · {data.user.status} · {data.user.accountType} ·{' '}
        {data.user.role}
      </p>

      <div className="detail-grid">
        <div className="panel">
          <strong>Billing efetivo ({scope})</strong>
          <pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(
              { plan: data.effectivePlan, quotas: data.effectiveQuotas },
              null,
              2,
            )}
          </pre>
          {data.company && (
            <>
              <strong>Empresa / subcontas</strong>
              <p>
                <Link to={`/companies/${data.company.id}`}>{data.company.name}</Link>
              </p>
              <ul>
                {data.company.members.map((m) => (
                  <li key={m.id}>
                    <Link to={`/accounts/${m.id}`}>{m.email}</Link> · {m.role}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <PlanEditor
          scope={scope}
          id={targetId}
          initial={{
            stripeProductId: data.effectivePlan.stripeProductId,
            stripeSubscriptionStatus: data.effectivePlan.stripeSubscriptionStatus,
            stripePriceId: data.effectivePlan.stripePriceId,
            quotaWhatsappBroadcastMetaLimit: data.effectiveQuotas
              .whatsappBroadcastMetaLimit as number | null,
            quotaFeedLimit: data.effectiveQuotas.feedLimit as number | null,
            quotaStoryLimit: data.effectiveQuotas.storyLimit as number | null,
            quotaGeniaLimit: data.effectiveQuotas.geniaLimit as number | null,
          }}
          onSaved={() => void load()}
        />
      </div>
    </div>
  );
}
