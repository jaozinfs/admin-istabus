import { FormEvent, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';

type Item = {
  id: string;
  quantity: number;
  expectedAmountCents: number;
  currency: string;
  status: string;
  rejectReason: string | null;
  stripeDashboardUrl: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  creditedAt: string | null;
  createdAt: string | null;
  userEmail: string | null;
  userName: string | null;
  scope: string;
};

type Page = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

function money(cents: number, currency = 'brl') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase() === 'BRL' ? 'BRL' : currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

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

export default function PurchasesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = page, dateOverride?: string) {
    setLoading(true);
    try {
      const day = dateOverride !== undefined ? dateOverride : date;
      const qs = new URLSearchParams({ page: String(p), limit: '25' });
      if (q.trim()) qs.set('q', q.trim());
      if (status) qs.set('status', status);
      if (day) qs.set('date', day);
      setData(await api<Page>(`/ops/purchases?${qs}`));
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
        title="Compras Stripe"
        subtitle="Pacotes de cota WhatsApp Meta — status, valor e link no Dashboard. Filtre por um dia (SP) se quiser."
      />

      <form className="toolbar fade-up" onSubmit={onSubmit}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title="Filtrar dia (SP) — vazio = todos"
        />
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar e-mail, session ou payment intent"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pending">pending</option>
          <option value="credited">credited</option>
          <option value="rejected">rejected</option>
          <option value="expired">expired</option>
        </select>
        <button type="submit" disabled={loading} className="shiny">
          {loading ? <Spinner size={16} label="Filtrando…" /> : 'Filtrar'}
        </button>
        {date ? (
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              setDate('');
              void load(1, '');
            }}
          >
            Limpar data
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
            title="Nenhuma compra"
            hint="Sem registros com esses filtros."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Cotas</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Stripe</th>
                    <th>Quando (SP)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div>{row.userName || '—'}</div>
                        <div className="muted">{row.userEmail || '—'}</div>
                        <div className="muted mono">{row.scope}</div>
                      </td>
                      <td className="mono">{row.quantity.toLocaleString('pt-BR')}</td>
                      <td className="mono">
                        {money(row.expectedAmountCents, row.currency)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === 'credited'
                              ? 'ok'
                              : row.status === 'rejected'
                                ? 'danger'
                                : ''
                          }`}
                        >
                          {row.status}
                        </span>
                        {row.rejectReason ? (
                          <div className="muted">{row.rejectReason}</div>
                        ) : null}
                      </td>
                      <td>
                        {row.stripeDashboardUrl ? (
                          <a
                            href={row.stripeDashboardUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir no Stripe
                          </a>
                        ) : (
                          '—'
                        )}
                        <div className="muted mono">
                          {(
                            row.stripePaymentIntentId ||
                            row.stripeCheckoutSessionId ||
                            ''
                          ).slice(0, 18)}
                        </div>
                      </td>
                      <td className="mono">{formatSp(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager" style={{ justifyContent: 'space-between' }}>
              <span className="muted">
                {data.total.toLocaleString('pt-BR')} registro(s)
                {date ? ` · ${date}` : ''}
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
