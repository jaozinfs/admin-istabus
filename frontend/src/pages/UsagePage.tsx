import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import { CardListSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import type { EffectiveQuotas } from '../lib/types';

type Funnel = {
  sent: number;
  deliveredAll: number;
  delivered: number;
  deliveredLivedata: number;
};

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
  funnel: Funnel;
};

type Daily = {
  day: string;
  totalMessages: number;
  totals?: Funnel;
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
  held?: number;
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

function metaTone(pct: number | null): 'accent' | 'ok' | 'warn' | 'danger' {
  if (pct == null) return 'accent';
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warn';
  return 'ok';
}

function funnelOf(row: Row): Funnel {
  return (
    row.funnel ?? {
      sent: 0,
      deliveredAll: 0,
      delivered: 0,
      deliveredLivedata: 0,
    }
  );
}

function FunnelGrid({
  funnel,
  compact = false,
}: {
  funnel: Funnel;
  compact?: boolean;
}) {
  const cells = [
    { label: 'Enviadas', value: funnel.sent, tone: 'accent' as const },
    {
      label: 'Todas entregues',
      value: funnel.deliveredAll,
      tone: 'ok' as const,
    },
    { label: 'Entregues', value: funnel.delivered, tone: '' as const },
    {
      label: 'Entregues LiveData',
      value: funnel.deliveredLivedata,
      tone: 'warn' as const,
    },
  ];
  return (
    <div className={`usage-funnel-grid${compact ? ' is-compact' : ''}`}>
      {cells.map((cell) => (
        <div className="usage-funnel-cell" key={cell.label}>
          <div className="usage-funnel-label">{cell.label}</div>
          <div className={`usage-funnel-value mono badge ${cell.tone}`.trim()}>
            {cell.value.toLocaleString('pt-BR')}
          </div>
        </div>
      ))}
    </div>
  );
}

function todaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function UsagePage() {
  const [date, setDate] = useState(todaySaoPaulo);
  const [data, setData] = useState<Daily | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Row | null>(null);
  const [dispatches, setDispatches] = useState<Dispatches | null>(null);
  const [dispLoading, setDispLoading] = useState(false);
  const [dispError, setDispError] = useState('');
  const [page, setPage] = useState(1);
  const [pausingKey, setPausingKey] = useState<string | null>(null);
  const [pauseMsg, setPauseMsg] = useState('');

  async function load(d = date) {
    setLoading(true);
    try {
      setData(await api<Daily>(`/usage/daily?date=${encodeURIComponent(d)}`));
      setError('');
      setPauseMsg('');
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

  async function pauseAccount(row: Row) {
    const label = row.userEmail || row.userId;
    const scope = row.companyId
      ? `empresa ${row.companyName || row.companyId}`
      : 'conta pessoal';
    if (
      !window.confirm(
        `Parar todos os disparos ativos de ${label} (${scope})?\n\nDisparos em preparação serão cancelados; os demais em andamento serão pausados.`,
      )
    ) {
      return;
    }
    const key = `${row.companyId}-${row.userId}`;
    setPausingKey(key);
    setPauseMsg('');
    try {
      const result = await api<{
        totalStopped: number;
        paused: number;
        cancelledPreparing: number;
      }>('/usage/pause-account', {
        method: 'POST',
        body: JSON.stringify({
          userId: row.userId,
          companyId: row.companyId,
        }),
      });
      setPauseMsg(
        `Conta parada: ${result.totalStopped} disparo(s) — ${result.paused} pausado(s), ${result.cancelledPreparing} cancelado(s) em preparação.`,
      );
      if (selected?.userId === row.userId) {
        void loadDispatches(row, page);
      }
      void load(date);
    } catch (e) {
      setPauseMsg(e instanceof Error ? e.message : 'Falha ao parar conta');
    } finally {
      setPausingKey(null);
    }
  }

  useEffect(() => {
    void load(date);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(date);
  }

  function openRow(row: Row) {
    setSelected(row);
    setDispatches(null);
    void loadDispatches(row, 1);
  }

  const totals: Funnel = data?.totals ?? {
    sent: 0,
    deliveredAll: 0,
    delivered: 0,
    deliveredLivedata: 0,
  };

  return (
    <div>
      <PageHeader
        title="Uso diário WhatsApp"
        subtitle="Funil do dia civil America/Sao_Paulo · toque numa conta para ver disparos ou parar a conta"
      />

      <form className="toolbar fade-up" onSubmit={onSubmit}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button disabled={loading} className="shiny">
          {loading ? <Spinner size={16} label="Carregando…" /> : 'Atualizar'}
        </button>
        <span className="badge accent">SP · {date}</span>
        <span className="badge">
          audits: {loading ? '…' : (data?.totalMessages ?? '—')}
        </span>
      </form>

      {error && <p className="error">{error}</p>}
      {pauseMsg && (
        <p className={pauseMsg.startsWith('Conta parada') ? 'success' : 'error'}>
          {pauseMsg}
        </p>
      )}

      {!loading && data && (data.accounts || []).length > 0 && (
        <div className="panel fade-up usage-day-totals">
          <div className="usage-section-title">Totais do dia</div>
          <FunnelGrid funnel={totals} />
        </div>
      )}

      <div className="panel fade-up">
        {loading ? (
          <>
            <div className="desk-only">
              <TableSkeleton rows={7} cols={6} />
            </div>
            <div className="mobile-only">
              <CardListSkeleton rows={5} />
            </div>
          </>
        ) : (data?.accounts || []).length === 0 ? (
          <EmptyState
            icon="chart"
            title="Nenhum disparo neste dia"
            hint="Escolha outra data ou aguarde novos envios WhatsApp."
          />
        ) : (
          <>
            <div className="table-wrap desk-only">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Empresa</th>
                    <th>Enviadas</th>
                    <th>Todas entregues</th>
                    <th>Entregues</th>
                    <th>Entregues LiveData</th>
                    <th>Meta (dia / cota)</th>
                    <th>Categorias / Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data!.accounts.map((row) => {
                    const funnel = funnelOf(row);
                    const key = `${row.companyId}-${row.userId}`;
                    return (
                      <tr
                        key={key}
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
                                <span
                                  className={`badge ${row.planActive ? 'ok' : ''}`}
                                >
                                  {row.planActive ? 'pago' : 'free'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="muted">pessoal</span>
                          )}
                        </td>
                        <td className="mono">{funnel.sent}</td>
                        <td className="mono">{funnel.deliveredAll}</td>
                        <td className="mono">{funnel.delivered}</td>
                        <td className="mono">{funnel.deliveredLivedata}</td>
                        <td>
                          <div className="mono">
                            {row.metaUsed} / {row.metaLimit ?? '—'}
                          </div>
                          {row.metaPct != null && (
                            <ProgressBar
                              value={row.metaPct}
                              tone={metaTone(row.metaPct)}
                            />
                          )}
                        </td>
                        <td>
                          <div className="tag-pills">
                            {Object.entries(row.byCategory).map(([k, v]) => (
                              <span className="tag-pill" key={`c-${k}`}>
                                {k.replace(/_/g, ' ')}: {v}
                              </span>
                            ))}
                            {Object.entries(row.byStatus).map(([k, v]) => (
                              <span className="tag-pill" key={`s-${k}`}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="danger"
                            disabled={pausingKey === key}
                            onClick={(e) => {
                              e.stopPropagation();
                              void pauseAccount(row);
                            }}
                          >
                            {pausingKey === key ? 'Parando…' : 'Parar conta'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list mobile-only">
              {data!.accounts.map((row) => {
                const funnel = funnelOf(row);
                const key = `${row.companyId}-${row.userId}`;
                return (
                  <div
                    key={key}
                    className="mobile-card"
                    onClick={() => openRow(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openRow(row);
                      }
                    }}
                  >
                    <div className="mobile-card-title">
                      {row.userEmail || row.userId.slice(0, 8)}
                    </div>
                    <div className="mobile-card-sub">
                      {row.companyName || (row.companyId ? 'empresa' : 'pessoal')} ·{' '}
                      {row.userName || '—'}
                    </div>
                    <div className="mobile-card-meta">
                      <span className={`badge ${row.planActive ? 'ok' : ''}`}>
                        {row.planActive ? 'pago' : 'free'}
                      </span>
                      <span className="badge mono">{row.total} audits</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <FunnelGrid funnel={funnel} compact />
                    </div>

                    {row.metaPct != null && (
                      <div style={{ marginTop: 10 }}>
                        <div className="mono meta-line" style={{ marginBottom: 4 }}>
                          Meta {row.metaUsed}/{row.metaLimit ?? '—'} ({row.metaPct}%)
                        </div>
                        <ProgressBar
                          value={row.metaPct}
                          tone={metaTone(row.metaPct)}
                        />
                      </div>
                    )}

                    <div className="tag-pills" style={{ marginTop: 10 }}>
                      {Object.entries(row.byCategory).map(([k, v]) => (
                        <span className="tag-pill" key={`mc-${k}`}>
                          {k.replace(/_/g, ' ')}: {v}
                        </span>
                      ))}
                      {Object.entries(row.byStatus).map(([k, v]) => (
                        <span className="tag-pill" key={`ms-${k}`}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="danger"
                      style={{ marginTop: 12, width: '100%' }}
                      disabled={pausingKey === key}
                      onClick={(e) => {
                        e.stopPropagation();
                        void pauseAccount(row);
                      }}
                    >
                      {pausingKey === key ? 'Parando…' : 'Parar conta'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <div
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Disparos do dia"
          >
            <div className="drawer-grabber mobile-only" aria-hidden />
            <div className="drawer-header">
              <div>
                <strong>Disparos · {date}</strong>
                <div className="muted" style={{ marginTop: 4 }}>
                  {selected.userEmail || selected.userId}
                  {selected.companyName ? ` · ${selected.companyName}` : ''}
                </div>
              </div>
              <div className="drawer-header-actions">
                <button
                  type="button"
                  className="danger"
                  disabled={
                    pausingKey === `${selected.companyId}-${selected.userId}`
                  }
                  onClick={() => void pauseAccount(selected)}
                >
                  {pausingKey === `${selected.companyId}-${selected.userId}`
                    ? 'Parando…'
                    : 'Parar conta'}
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setSelected(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="drawer-body">
              <div style={{ marginBottom: 14 }}>
                <div className="usage-section-title">Funil desta conta</div>
                <FunnelGrid funnel={funnelOf(selected)} compact />
              </div>

              {dispLoading && (
                <div style={{ padding: '0.5rem 0 1rem' }}>
                  <div className="spinner-wrap muted" style={{ marginBottom: 14 }}>
                    <span className="spinner on-light" style={{ width: 18, height: 18 }} />
                    Carregando disparos…
                  </div>
                  <TableSkeleton rows={4} cols={4} />
                </div>
              )}
              {dispError && <p className="error">{dispError}</p>}
              {!dispLoading && dispatches && (
                <>
                  <div className="toolbar">
                    <span className="badge accent">{dispatches.total} disparo(s)</span>
                    <span className="badge">
                      pág. {dispatches.page}/{dispatches.totalPages}
                    </span>
                  </div>

                  {dispatches.items.length === 0 ? (
                    <EmptyState
                      title="Nenhum disparo neste filtro"
                      hint="Não há envios agendados ou concluídos para esta conta no dia."
                    />
                  ) : (
                    <>
                      <div className="table-wrap desk-only">
                        <table>
                          <thead>
                            <tr>
                              <th>Sender</th>
                              <th>Nome</th>
                              <th>Data</th>
                              <th>Qtd</th>
                              <th>Entregues</th>
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
                                    ok {d.accepted} · fail {d.failed} · pend{' '}
                                    {d.pending}
                                  </div>
                                </td>
                                <td className="mono">{d.delivered}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      d.inProgress
                                        ? 'warn'
                                        : d.broadcastStatus === 'sent'
                                          ? 'ok'
                                          : d.broadcastStatus === 'paused'
                                            ? 'danger'
                                            : ''
                                    }`}
                                  >
                                    {d.inProgress
                                      ? `em andamento (${d.broadcastStatus})`
                                      : d.broadcastStatus || d.status}
                                  </span>
                                  {d.progressPct != null && (
                                    <ProgressBar
                                      value={d.progressPct}
                                      tone={d.inProgress ? 'warn' : 'ok'}
                                    />
                                  )}
                                  {d.errorMessage && (
                                    <div className="error" style={{ marginTop: 4 }}>
                                      {d.errorMessage.slice(0, 120)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mobile-card-list mobile-only">
                        {dispatches.items.map((d) => (
                          <div
                            className="mobile-card"
                            key={d.id}
                            style={{ cursor: 'default' }}
                          >
                            <div className="mobile-card-title">{d.name}</div>
                            <div className="mobile-card-sub">
                              {d.senderEmail || d.provider}
                              {d.tag ? ` · ${d.tag}` : ''}
                            </div>
                            <div className="mobile-card-meta">
                              <span
                                className={`badge ${
                                  d.inProgress
                                    ? 'warn'
                                    : d.broadcastStatus === 'sent'
                                      ? 'ok'
                                      : d.broadcastStatus === 'paused'
                                        ? 'danger'
                                        : ''
                                }`}
                              >
                                {d.inProgress
                                  ? 'em andamento'
                                  : d.broadcastStatus || d.status}
                              </span>
                              <span className="mono meta-line">qtd {d.quantity}</span>
                              <span className="mono meta-line">
                                entregues {d.delivered}
                              </span>
                            </div>
                            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                              ok {d.accepted} · fail {d.failed} · pend {d.pending}
                              {d.held != null ? ` · held ${d.held}` : ''}
                            </div>
                            {d.progressPct != null && (
                              <div style={{ marginTop: 10 }}>
                                <ProgressBar
                                  value={d.progressPct}
                                  tone={d.inProgress ? 'warn' : 'ok'}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

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
