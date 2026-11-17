import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CompanyReportPanel from '../components/CompanyReportPanel';
import PlanEditor from '../components/PlanEditor';
import QuotaCards from '../components/QuotaCards';
import StripeMetaBadge from '../components/StripeMetaBadge';
import Toast from '../components/Toast';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo, StoredQuotas } from '../lib/types';

type Detail = {
  id: string;
  name: string;
  createdAt: string;
  plan: PlanInfo;
  quotasStored: StoredQuotas;
  quotasEffective: EffectiveQuotas;
  stripeMeta: {
    status: string;
    ok: boolean;
    keys: Record<string, string>;
    waMetaFromStripe?: string | null;
  };
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
  const [toast, setToast] = useState<{ msg: string; kind?: 'ok' | 'error' } | null>(
    null,
  );

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

  useEffect(() => {
    if (!data) return;
    if (window.location.hash === '#relatorio') {
      document.getElementById('relatorio')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data]);

  if (!data) return <p className="muted">{error || 'carregando…'}</p>;

  return (
    <div>
      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}
      <p className="muted">
        <Link to="/companies">← empresas</Link>
      </p>
      <h1 className="page-title">{data.name}</h1>
      <p className="page-sub">
        Criada em {new Date(data.createdAt).toLocaleString('pt-BR')} ·{' '}
        {data.members.length} membro(s)
      </p>

      <div className="toolbar">
        <span className={`badge ${data.plan.active ? 'ok' : 'warn'}`}>
          {data.plan.active ? 'plano ativo' : 'free / inativo'}
        </span>
        <span className="badge accent mono">
          {data.plan.stripeProductId || 'sem product'}
        </span>
        <span className="badge">
          status: {data.plan.stripeSubscriptionStatus || 'null'}
        </span>
        <StripeMetaBadge meta={data.stripeMeta} />
        <a className="badge accent" href="#relatorio">
          Relatório
        </a>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <CompanyReportPanel companyId={data.id} />
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ marginTop: 0 }}>
          <div className="panel">
            <strong>Cotas efetivas (como o InstaBuss enxerga)</strong>
            <p className="hint">
              null no banco → metadata Stripe do produto → free. Produto
              atual tem <span className="mono">cota_whatsapp_disparo_meta</span> no
              Stripe test.
            </p>
            {data.stripeMeta?.status === 'missing_key' && (
              <p className="error">
                Falta <span className="mono">STRIPE_SECRET_KEY</span> (sk_test…) na
                Vercel — sem isso a Meta efetiva fica no free.
              </p>
            )}
            {data.stripeMeta?.status === 'timeout' && (
              <p className="error">Timeout ao falar com a Stripe (4s). Tente de novo.</p>
            )}
            <div style={{ marginTop: '0.85rem' }}>
              <QuotaCards effective={data.quotasEffective} />
            </div>
            {data.quotasEffective.periodEnd && (
              <p className="hint" style={{ marginTop: '0.8rem' }}>
                período até{' '}
                {new Date(data.quotasEffective.periodEnd).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <div className="panel">
            <strong>Membros</strong>
            <ul className="member-list">
              {data.members.map((m) => (
                <li key={m.id}>
                  <div>
                    <Link to={`/accounts/${m.id}`}>{m.email}</Link>
                    <div className="muted">{m.name || '—'}</div>
                  </div>
                  <div className="badge">
                    {m.role} · {m.status}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PlanEditor
          scope="company"
          id={data.id}
          plan={data.plan}
          stored={data.quotasStored}
          onSaved={() => void load()}
          onToast={(msg, kind) => setToast({ msg, kind })}
        />
      </div>
    </div>
  );
}
