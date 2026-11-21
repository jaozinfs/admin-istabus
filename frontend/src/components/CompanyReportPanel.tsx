import { FormEvent, useEffect, useState } from 'react';
import EmptyState from './ui/EmptyState';
import { StatSkeleton, TableSkeleton } from './ui/Skeleton';
import Spinner from './ui/Spinner';
import { api } from '../lib/api';

type Report = {
  companyId: string;
  companyName: string;
  scope: 'lifetime' | 'month';
  month: string | null;
  whatsapp: {
    dispatches: number;
    messages: number;
    quantitySum: number;
    acceptedSum: number;
    failedSum: number;
    deliveredSum: number;
    pendingSum: number;
    inProgressDispatches: number;
    byCategory: Record<string, number>;
    byBroadcastStatus: Record<string, number>;
  };
  posts: {
    total: number;
    byType: Record<string, number>;
  };
  monthlyBreakdown: Array<{
    month: string;
    dispatches: number;
    messages: number;
    quantitySum: number;
  }>;
};

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function CompanyReportPanel({ companyId }: { companyId: string }) {
  const [month, setMonth] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(m = month) {
    setLoading(true);
    setError('');
    try {
      const qs = m ? `?month=${encodeURIComponent(m)}` : '';
      setReport(await api<Report>(`/usage/company-report/${companyId}${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no relatório');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function onMonth(e: FormEvent) {
    e.preventDefault();
    void load(month);
  }

  return (
    <div className="panel" id="relatorio">
      <div className="toolbar" style={{ marginBottom: '0.75rem' }}>
        <strong>Relatório de uso</strong>
        <span className="badge">
          {loading
            ? '…'
            : report?.scope === 'month'
              ? `mês ${report.month}`
              : 'toda a vida'}
        </span>
      </div>

      <form className="toolbar" onSubmit={onMonth}>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? <Spinner size={16} label="Carregando…" /> : 'Filtrar mês'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={() => {
            setMonth('');
            void load('');
          }}
        >
          Ver total (vida)
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={() => {
            const m = currentMonth();
            setMonth(m);
            void load(m);
          }}
        >
          Mês atual
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && !report && (
        <>
          <div className="grid-stats" style={{ marginTop: '0.5rem' }}>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <TableSkeleton rows={4} cols={4} />
          </div>
        </>
      )}

      {report && (
        <>
          {loading && (
            <div className="spinner-wrap muted" style={{ marginBottom: 10 }}>
              <span className="spinner on-light" style={{ width: 16, height: 16 }} />
              Atualizando…
            </div>
          )}
          <div className="grid-stats" style={{ marginTop: '0.5rem' }}>
            <div className="panel stat" style={{ boxShadow: 'none' }}>
              <div className="label">Disparos</div>
              <div className="value">{report.whatsapp.dispatches}</div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                em andamento: {report.whatsapp.inProgressDispatches}
              </div>
            </div>
            <div className="panel stat" style={{ boxShadow: 'none' }}>
              <div className="label">Destinatários (soma)</div>
              <div className="value">{report.whatsapp.quantitySum}</div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                ok {report.whatsapp.acceptedSum} · fail {report.whatsapp.failedSum}
              </div>
            </div>
            <div className="panel stat" style={{ boxShadow: 'none' }}>
              <div className="label">Msgs auditadas</div>
              <div className="value">{report.whatsapp.messages}</div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                entregues: {report.whatsapp.deliveredSum}
              </div>
            </div>
            <div className="panel stat" style={{ boxShadow: 'none' }}>
              <div className="label">Posts</div>
              <div className="value">{report.posts.total}</div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>
                {Object.entries(report.posts.byType)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ') || '—'}
              </div>
            </div>
          </div>

          <div className="detail-grid" style={{ marginTop: '0.85rem' }}>
            <div>
              <div className="field-label">Por categoria WA</div>
              <div className="tag-pills" style={{ marginTop: 8 }}>
                {Object.entries(report.whatsapp.byCategory).map(([k, v]) => (
                  <span className="tag-pill" key={k}>
                    {k}: {v}
                  </span>
                ))}
                {Object.keys(report.whatsapp.byCategory).length === 0 && (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="field-label">Status dos disparos</div>
              <div className="tag-pills" style={{ marginTop: 8 }}>
                {Object.entries(report.whatsapp.byBroadcastStatus).map(([k, v]) => (
                  <span className="tag-pill" key={k}>
                    {k}: {v}
                  </span>
                ))}
                {Object.keys(report.whatsapp.byBroadcastStatus).length === 0 && (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
          </div>

          {report.scope === 'lifetime' && report.monthlyBreakdown.length === 0 && (
            <div style={{ marginTop: '1rem' }}>
              <EmptyState
                icon="chart"
                title="Sem histórico mensal"
                hint="Ainda não há breakdown mensal para esta empresa."
              />
            </div>
          )}

          {report.scope === 'lifetime' && report.monthlyBreakdown.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Por mês (últimos 24)</strong>
              <div className="table-wrap desk-only">
                <table style={{ marginTop: 8, minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Disparos</th>
                      <th>Destinatários</th>
                      <th>Msgs</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.monthlyBreakdown.map((m) => (
                      <tr key={m.month}>
                        <td className="mono">{m.month}</td>
                        <td className="mono">{m.dispatches}</td>
                        <td className="mono">{m.quantitySum}</td>
                        <td className="mono">{m.messages}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              setMonth(m.month);
                              void load(m.month);
                            }}
                          >
                            ver mês
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-card-list mobile-only" style={{ marginTop: 10 }}>
                {report.monthlyBreakdown.map((m) => (
                  <div className="mobile-card" key={m.month} style={{ cursor: 'default' }}>
                    <div className="mobile-card-title mono">{m.month}</div>
                    <div className="mobile-card-meta">
                      <span className="meta-line">{m.dispatches} disparos</span>
                      <span className="meta-line">{m.quantitySum} dest.</span>
                      <button
                        type="button"
                        className="secondary"
                        style={{ minHeight: '2.35rem', padding: '0.45rem 0.8rem' }}
                        onClick={() => {
                          setMonth(m.month);
                          void load(m.month);
                        }}
                      >
                        ver mês
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
