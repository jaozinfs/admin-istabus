import { FormEvent, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';

type Item = {
  id: string;
  email: string;
  userName: string | null;
  success: boolean;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  tokenHint: string | null;
  dayTokenHint: string | null;
  createdAt: string;
};

type Page = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  day: string | null;
};

function todaySp(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatSp(iso: string) {
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

export default function LoginsPage() {
  const [q, setQ] = useState('');
  const [success, setSuccess] = useState('');
  // Vazio = todos os dias; o usuário pode filtrar um dia SP.
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
      if (success) qs.set('success', success);
      if (day) qs.set('date', day);
      setData(await api<Page>(`/ops/logins?${qs}`));
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
        title="Logins diários"
        subtitle="Quem executou cada tentativa de auth no InstaBuss — e o token do dia, se existir (America/Sao_Paulo)."
      />

      <form className="toolbar fade-up" onSubmit={onSubmit}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title="Dia (SP) — vazio = todos"
        />
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar nome, e-mail, IP, motivo ou token"
        />
        <select value={success} onChange={(e) => setSuccess(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Sucesso</option>
          <option value="false">Falha</option>
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
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              const d = todaySp();
              setDate(d);
              void load(1, d);
            }}
          >
            Hoje
          </button>
        )}
      </form>

      {error ? <p className="error">{error}</p> : null}

      <div className="panel fade-up">
        {loading && !data ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data?.items.length ? (
          <EmptyState
            icon="inbox"
            title="Nenhum login auditado"
            hint="Sem linhas nesse dia, ou os filtros não bateram."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Quem</th>
                    <th>Resultado</th>
                    <th>Motivo</th>
                    <th>Token</th>
                    <th>IP</th>
                    <th>Quando (SP)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const token = row.tokenHint || row.dayTokenHint;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div>{row.userName || '—'}</div>
                          <div className="muted">{row.email}</div>
                          {row.userAgent ? (
                            <div className="muted" title={row.userAgent}>
                              {row.userAgent.slice(0, 72)}
                              {row.userAgent.length > 72 ? '…' : ''}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`badge ${row.success ? 'ok' : 'danger'}`}>
                            {row.success ? 'Sucesso' : 'Falha / desafio'}
                          </span>
                        </td>
                        <td className="mono">{row.reason || '—'}</td>
                        <td>
                          {token ? (
                            <span className="mono" title={token}>
                              {token}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                          {!row.tokenHint && row.dayTokenHint ? (
                            <div className="muted">do dia</div>
                          ) : null}
                        </td>
                        <td className="mono">{row.ip || '—'}</td>
                        <td className="mono">{formatSp(row.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pager" style={{ justifyContent: 'space-between' }}>
              <span className="muted">
                {data.total.toLocaleString('pt-BR')} registro(s)
                {data.day ? ` · ${data.day}` : ''}
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
