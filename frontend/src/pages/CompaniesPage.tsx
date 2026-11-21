import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { CardListSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo } from '../lib/types';

type Row = {
  id: string;
  name: string;
  createdAt: string;
  plan: PlanInfo;
  quotasEffective: EffectiveQuotas;
  members: Array<{ id: string; email: string }>;
};

export default function CompaniesPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const nav = useNavigate();

  async function load(query = q) {
    setLoading(true);
    try {
      setRows(
        await api<Row[]>(
          `/accounts/companies${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        ),
      );
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
        title="Empresas"
        subtitle="Billing da empresa + membros / subcontas"
      />
      <form className="toolbar fade-up" onSubmit={onSearch}>
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar empresa"
        />
        <button disabled={loading} className="shiny">
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
            title={searched ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa ainda'}
            hint={
              searched
                ? 'Tente outro nome de empresa.'
                : 'Empresas do InstaBuss vão aparecer nesta lista.'
            }
          />
        ) : (
          <>
            <div className="table-wrap desk-only">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Membros</th>
                    <th>Plano</th>
                    <th>WA Meta efetivo</th>
                    <th>GenIA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="row-click"
                      onClick={() => nav(`/companies/${r.id}`)}
                    >
                      <td>
                        <Link
                          to={`/companies/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.name}
                        </Link>
                        <div className="muted">
                          {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="mono">{r.members.length}</td>
                      <td>
                        <span className={`badge ${r.plan.active ? 'ok' : ''}`}>
                          {r.plan.active ? 'ativo' : 'free'}
                        </span>
                        <div className="mono muted">
                          {r.plan.stripeProductId || '—'}
                        </div>
                      </td>
                      <td className="mono">
                        {r.quotasEffective.whatsappBroadcastMetaLimit}
                      </td>
                      <td className="mono">
                        {r.quotasEffective.geniaUsed}/{r.quotasEffective.geniaLimit}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/companies/${r.id}#relatorio`);
                          }}
                        >
                          Relatório
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list mobile-only">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="mobile-card"
                  onClick={() => nav(`/companies/${r.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      nav(`/companies/${r.id}`);
                    }
                  }}
                >
                  <div className="mobile-card-title">{r.name}</div>
                  <div className="mobile-card-sub">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')} ·{' '}
                    {r.members.length} membro(s)
                  </div>
                  <div className="mobile-card-meta">
                    <span className={`badge ${r.plan.active ? 'ok' : ''}`}>
                      {r.plan.active ? 'ativo' : 'free'}
                    </span>
                    <span className="mono meta-line">
                      GenIA {r.quotasEffective.geniaUsed}/{r.quotasEffective.geniaLimit}
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      style={{ minHeight: '2.35rem', padding: '0.45rem 0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        nav(`/companies/${r.id}#relatorio`);
                      }}
                    >
                      Relatório
                    </button>
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
