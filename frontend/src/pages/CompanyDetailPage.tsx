import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlanEditor from '../components/PlanEditor';
import { api } from '../lib/api';

type Detail = {
  id: string;
  name: string;
  createdAt: string;
  plan: {
    stripeProductId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId: string | null;
  };
  quotas: Record<string, number | string | null>;
  members: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
  }>;
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    try {
      setData(await api<Detail>(`/accounts/companies/${id}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!data) return <p className="muted">{error || 'carregando…'}</p>;

  return (
    <div>
      <p className="muted">
        <Link to="/companies">← empresas</Link>
      </p>
      <h2 style={{ marginTop: 0 }}>{data.name}</h2>
      <div className="detail-grid">
        <div className="panel">
          <strong>Plano / cotas</strong>
          <pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify({ plan: data.plan, quotas: data.quotas }, null, 2)}
          </pre>
          <strong>Membros</strong>
          <ul>
            {data.members.map((m) => (
              <li key={m.id}>
                <Link to={`/accounts/${m.id}`}>{m.email}</Link> · {m.role} ·{' '}
                {m.status}
              </li>
            ))}
          </ul>
        </div>
        <PlanEditor
          scope="company"
          id={data.id}
          initial={{
            stripeProductId: data.plan.stripeProductId,
            stripeSubscriptionStatus: data.plan.stripeSubscriptionStatus,
            stripePriceId: data.plan.stripePriceId,
            quotaWhatsappBroadcastMetaLimit: data.quotas
              .whatsappBroadcastMetaLimit as number | null,
            quotaFeedLimit: data.quotas.feedLimit as number | null,
            quotaStoryLimit: data.quotas.storyLimit as number | null,
            quotaGeniaLimit: data.quotas.geniaLimit as number | null,
          }}
          onSaved={() => void load()}
        />
      </div>
    </div>
  );
}
