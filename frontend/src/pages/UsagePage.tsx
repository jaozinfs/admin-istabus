import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { EffectiveQuotas } from '../lib/types';

type Row = {
  companyId: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  companyName: string | null;
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  planActive: boolean;
  metaUsed: number;
  metaLimit: number | null;
  metaPct: number | null;
  quotasEffective: EffectiveQuotas | null;
};

type Daily = {
  day: string;
  totalMessages: number;
  accounts: Row[];
};

type DispatchItem = {
  id: string;
  senderName: string | null;
  senderEmail: string | null;
  companyName: string | null;
  name: string;
  targetType: string;
  provider: string;
  tag: string | null;
  date: string | null;
  quantity: number;
  processed: number;
  accepted: number;
  failed: number;
  pending: number;
  delivered: number;
  inProgress: boolean;
  progressPct: number | null;
  status: string;
  broadcastStatus: string | null;
  errorMessage: string | null;
};

type Dispatches = {
  day: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: DispatchItem[];
};

export default function UsagePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Daily | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Row | null>(null);
  const [dispatches, setDispatches] = useState<Dispatches | null>(null);
  const [dispLoading, setDispLoading] = useState(false);
  const [dispError, setDispError] = useState('');
  const [page, setPage] = useState(1);

  async function load(d = date) {
    setLoading(true);
    try {
      setData(await api<Daily>(`/usage/daily?date=${encodeURIComponent(d)}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function loadDispatches(row: Row, p = 1) {
    setDispLoading(true);
    setDispError('');
    try {
      const qs = new URLSearchParams({
        date,
        page: String(p),
        pageSize: '20',
        userId: row.userId,
      });
      if (row.companyId) qs.set('companyId', row.companyId);
      setDispatches(await api<Dispatches>(`/usage/dispatches?${qs}`));
      setPage(p);
    } catch (e) {
      setDispError(e instanceof Error ? e.message : 'Erro ao carregar disparos');
    } finally {
      setDispLoading(false);
    }
  }

  useEffect(() => {
    void load(date);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(date);
  }

  function openRow(row: Row) {
    setSelected(row);
    setDispatches(null);
    void loadDispatches(row, 1);
  }

  return (
    <div>
      <h1 className="page-title">Uso diário WhatsApp</h1>
      <p className="page-sub">
        Clique numa conta para ver os disparos do dia (paginado)
      </p>

      <form className="toolbar" onSubmit={onSubmit}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button disabled={loading}>{loading ? 'Carregando…' : 'Atualizar'}</button>
        <span className="badge accent">total: {data?.totalMessages ?? '—'}</span>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Empresa</th>
              <th>Enviados no dia</th>
              <th>Meta (dia / cota)</th>
              <th>Categorias</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.accounts || []).map((row) => (
              <tr
                key={`${row.companyId}-${row.userId}`}
                className="row-click"
                onClick={() => openRow(row)}
              >
                <td>
                  <Link
                    to={`/accounts/${row.userId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.userEmail || row.userId.slice(0, 8)}
                  </Link>
                  <div className="muted">{row.userName || '—'}</div>
                </td>
                <td>
                  {row.companyId ? (
                    <>
                      <Link
                        to={`/companies/${row.companyId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.companyName || row.companyId.slice(0, 8)}
                      </Link>
                      <div>
                        <span className={`badge ${row.planActive ? 'ok' : ''}`}>
                          {row.planActive ? 'pago' : 'free'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="muted">pessoal</span>
                  )}
                </td>
                <td className="mono">{row.total}</td>
                <td>
                  <div className="mono">
                    {row.metaUsed} / {row.metaLimit ?? '—'}
                  </div>
                  {row.metaPct != null && (
                    <div className="bar">
                      <span style={{ width: `${Math.min(row.metaPct, 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="mono">
                  {Object.entries(row.byCategory)
                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                    .join(' · ') || '—'}
                </td>
                <td className="mono">
                  {Object.entries(row.byStatus)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ') || '—'}
                </td>
              </tr>
            ))}
            {!loading && (data?.accounts || []).length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum disparo neste dia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <strong>Disparos · {date}</strong>
                <div className="muted" style={{ marginTop: 4 }}>
                  {selected.userEmail || selected.userId}
                  {selected.companyName ? ` · ${selected.companyName}` : ''}
                </div>
              </div>
              <button className="secondary" type="button" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
            <div className="drawer-body">
              {dispLoading && <p className="muted">Carregando disparos…</p>}
              {dispError && <p className="error">{dispError}</p>}
              {!dispLoading && dispatches && (
                <>
                  <div className="toolbar">
                    <span className="badge accent">
                      {dispatches.total} disparo(s)
                    </span>
                    <span className="badge">
                      pág. {dispatches.page}/{dispatches.totalPages}
                    </span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Sender</th>
                        <th>Nome</th>
                        <th>Data</th>
                        <th>Qtd</th>
                        <th>Andamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatches.items.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <div>{d.senderEmail || '—'}</div>
                            <div className="muted">{d.senderName || d.provider}</div>
                          </td>
                          <td>
                            <div>{d.name}</div>
                            <div className="muted">
                              {d.targetType}
                              {d.tag ? ` · tag ${d.tag}` : ''}
                            </div>
                          </td>
                          <td className="mono">
                            {d.date
                              ? new Date(d.date).toLocaleString('pt-BR')
                              : '—'}
                          </td>
                          <td className="mono">
                            <div>{d.quantity}</div>
                            <div className="muted">
                              ok {d.accepted} · fail {d.failed} · pend {d.pending}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                d.inProgress ? 'warn' : d.broadcastStatus === 'sent' ? 'ok' : ''
                              }`}
                            >
                              {d.inProgress
                                ? `em andamento (${d.broadcastStatus})`
                                : d.broadcastStatus || d.status}
                            </span>
                            {d.progressPct != null && (
                              <div className="bar">
                                <span
                                  style={{
                                    width: `${Math.min(d.progressPct, 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                            {d.errorMessage && (
                              <div className="error" style={{ marginTop: 4 }}>
                                {d.errorMessage.slice(0, 120)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {dispatches.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="muted">
                            Nenhum disparo agendado/enviado neste filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="pager">
                    <button
                      className="secondary"
                      type="button"
                      disabled={page <= 1 || dispLoading}
                      onClick={() => void loadDispatches(selected, page - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={
                        !dispatches ||
                        page >= dispatches.totalPages ||
                        dispLoading
                      }
                      onClick={() => void loadDispatches(selected, page + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
