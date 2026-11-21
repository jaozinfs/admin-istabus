import { FormEvent, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
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
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = page) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(p),
        limit: '25',
      });
      if (q.trim()) qs.set('q', q.trim());
      if (status) qs.set('status', status);
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

  return (
    <div>
      <PageHeader
        title="Consumo histórico"
        subtitle="Todos os disparos WhatsApp — busca, status e paginação (America/Sao_Paulo)."
      />

      <form className="toolbar fade-up" onSubmit={onSubmit}>
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
      </form>

      {error ? <p className="error">{error}</p> : null}

      <div className="panel fade-up">
        {loading && !data ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data?.items.length ? (
          <EmptyState
            icon="search"
            title="Nenhum disparo"
            hint="Ajuste os filtros ou tente outro termo."
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
                    <th>Aceitos/Total</th>
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
                        {row.accepted.toLocaleString('pt-BR')}/
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
