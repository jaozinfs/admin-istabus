import { FormEvent, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { StatSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';

type Item = {
  id: string;
  name: string | null;
  status: string | null;
  provider: string | null;
  total: number;
  accepted: number;
  delivered: number;
  failed: number;
  pending: number;
  scheduledAt: string | null;
  userEmail: string | null;
  userName: string | null;
};

type Page = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  summary?: {
    dispatchedTotal: number;
    deliveredTotal: number;
    acceptedTotal: number;
  };
};

function formatSp(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function BroadcastHistoryPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(
    p = page,
    range?: { from?: string; to?: string },
  ) {
    setLoading(true);
    try {
      const fromVal = range?.from !== undefined ? range.from : from;
      const toVal = range?.to !== undefined ? range.to : to;
      const qs = new URLSearchParams({
        page: String(p),
        limit: '25',
      });
      if (q.trim()) qs.set('q', q.trim());
      if (status) qs.set('status', status);
      if (fromVal) qs.set('from', fromVal);
      if (toVal) qs.set('to', toVal);
      setData(await api<Page>(`/ops/broadcasts?${qs}`));
      setError('');
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(1);
  }

  const summary = data?.summary;

  return (
    <div>
      <PageHeader
        title="Consumo histórico"
        subtitle="Disparos WhatsApp — totais do filtro, intervalo de datas (SP) e paginação."
      />

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {loading && !data ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="panel stat fade-up">
              <div className="label">Disparados (total)</div>
              <div className="value">
                {(summary?.dispatchedTotal ?? 0).toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="panel stat fade-up" style={{ animationDelay: '40ms' }}>
              <div className="label">Entregues (total)</div>
              <div className="value">
                {(summary?.deliveredTotal ?? 0).toLocaleString('pt-BR')}
              </div>
            </div>
          </>
        )}
      </div>

      <form className="toolbar fade-up" onSubmit={onSubmit}>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="De (SP)"
        />
        <span className="muted">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Até (SP, inclusivo)"
        />
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar nome, e-mail ou id"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="preparing">preparing</option>
          <option value="queued">queued</option>
          <option value="processing">processing</option>
          <option value="paused">paused</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <button type="submit" disabled={loading} className="shiny">
          {loading ? <Spinner size={16} label="Filtrando…" /> : 'Filtrar'}
        </button>
        {from || to ? (
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              setFrom('');
              setTo('');
              void load(1, { from: '', to: '' });
            }}
          >
            Limpar datas
          </button>
        ) : null}
      </form>

      {error ? <p className="error">{error}</p> : null}

      <div className="panel fade-up">
        {loading && !data ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data?.items.length ? (
          <EmptyState
            icon="search"
            title="Nenhum disparo"
            hint="Ajuste o intervalo ou outros filtros."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Disparo</th>
                    <th>Usuário</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Aceitos / Entregues / Total</th>
                    <th>Quando (SP)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div>{row.name || '—'}</div>
                        <div className="muted mono">{row.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <div>{row.userName || '—'}</div>
                        <div className="muted">{row.userEmail || '—'}</div>
                      </td>
                      <td>
                        <span className="badge">{row.status || '—'}</span>
                      </td>
                      <td className="mono">{row.provider || '—'}</td>
                      <td className="mono">
                        {row.accepted.toLocaleString('pt-BR')} /{' '}
                        {row.delivered.toLocaleString('pt-BR')} /{' '}
                        {row.total.toLocaleString('pt-BR')}
                        {row.failed > 0 ? (
                          <span className="muted"> · fail {row.failed}</span>
                        ) : null}
                      </td>
                      <td className="mono">{formatSp(row.scheduledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager" style={{ justifyContent: 'space-between' }}>
              <span className="muted">
                {data.total.toLocaleString('pt-BR')} registro(s)
                {summary ? (
                  <>
                    {' '}
                    · aceitos{' '}
                    {summary.acceptedTotal.toLocaleString('pt-BR')}
                  </>
                ) : null}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1)}
                >
                  Anterior
                </button>
                <span className="mono">
                  {page}/{data.pageCount}
                </span>
                <button
                  type="button"
                  className="secondary"
                  disabled={page >= data.pageCount || loading}
                  onClick={() => void load(page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
