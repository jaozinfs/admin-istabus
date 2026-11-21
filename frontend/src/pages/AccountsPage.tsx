import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { CardListSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo } from '../lib/types';

type Row = {
  userId: string;
  email: string;
  name: string | null;
  status: string;
  company: { id: string; name: string } | null;
  plan: PlanInfo;
  quotasEffective: EffectiveQuotas;
};

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const nav = useNavigate();

  async function load(query = q) {
    setLoading(true);
    try {
      const data = await api<Row[]>(
        `/accounts${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      setRows(data);
      setError('');
      setSearched(Boolean(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load(q);
  }

  return (
    <div>
      <PageHeader
        title="Contas"
        subtitle="Usuários InstaBuss com plano efetivo e cotas"
      />
      <form className="toolbar fade-up" onSubmit={onSearch}>
        <input
          style={{ flex: 1 }}
          placeholder="buscar email, nome, empresa"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" disabled={loading} className="shiny">
          {loading ? <Spinner size={16} label="Buscando…" /> : 'Buscar'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="panel fade-up">
        {loading ? (
          <>
            <div className="desk-only">
              <TableSkeleton rows={7} cols={5} />
            </div>
            <div className="mobile-only">
              <CardListSkeleton rows={5} />
            </div>
          </>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={searched ? 'search' : 'inbox'}
            title={searched ? 'Nenhuma conta encontrada' : 'Nenhuma conta ainda'}
            hint={
              searched
                ? 'Tente outro email, nome ou empresa.'
                : 'Quando houver usuários no InstaBuss, eles aparecem aqui.'
            }
          />
        ) : (
          <>
            <div className="table-wrap desk-only">
              <table>
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Empresa</th>
                    <th>Plano</th>
                    <th>WA Meta</th>
                    <th>Feed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.userId}
                      className="row-click"
                      onClick={() => nav(`/accounts/${r.userId}`)}
                    >
                      <td>
                        <Link
                          to={`/accounts/${r.userId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.email}
                        </Link>
                        <div className="muted">{r.name || r.status}</div>
                      </td>
                      <td>
                        {r.company ? (
                          <Link
                            to={`/companies/${r.company.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.company.name}
                          </Link>
                        ) : (
                          <span className="muted">pessoal</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${r.plan.active ? 'ok' : ''}`}>
                          {r.plan.active ? 'ativo' : 'free'} · {r.plan.scope}
                        </span>
                        <div className="mono muted">
                          {r.plan.stripeProductId || '—'}
                        </div>
                      </td>
                      <td className="mono">
                        {r.quotasEffective.whatsappBroadcastMetaLimit}
                      </td>
                      <td className="mono">
                        {r.quotasEffective.feedUsed}/{r.quotasEffective.feedLimit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list mobile-only">
              {rows.map((r) => (
                <div
                  key={r.userId}
                  className="mobile-card"
                  onClick={() => nav(`/accounts/${r.userId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      nav(`/accounts/${r.userId}`);
                    }
                  }}
                >
                  <div className="mobile-card-title">{r.email}</div>
                  <div className="mobile-card-sub">{r.name || r.status}</div>
                  <div className="mobile-card-meta">
                    <span className={`badge ${r.plan.active ? 'ok' : ''}`}>
                      {r.plan.active ? 'ativo' : 'free'}
                    </span>
                    <span className="meta-line">
                      {r.company ? r.company.name : 'pessoal'}
                    </span>
                    <span className="mono meta-line">
                      feed {r.quotasEffective.feedUsed}/{r.quotasEffective.feedLimit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
