import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { StatSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';

type Stats = {
  users: number;
  companies: number;
  activePaidCompanies: number;
  activePaidPersonalUsers: number;
  activePaidTotal: number;
};

type Top = {
  day: string;
  top: Array<{
    companyId: string | null;
    companyName: string | null;
    userId: string;
    userEmail: string | null;
    userName: string | null;
    total: number;
    metaUsed: number;
    metaLimit: number | null;
    byCategory: Record<string, number>;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [top, setTop] = useState<Top | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Stats>('/accounts/stats'),
      api<Top>('/usage/top-today?limit=15'),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTop(t);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  const waToday = top ? top.top.reduce((s, a) => s + a.total, 0) : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das contas InstaBuss e uso de hoje"
      />
      {error && <p className="error">{error}</p>}

      <div className="grid-stats">
        {loading || !stats ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="panel stat fade-up">
              <div className="label">Usuários</div>
              <div className="value">{stats.users}</div>
            </div>
            <div className="panel stat fade-up" style={{ animationDelay: '40ms' }}>
              <div className="label">Empresas</div>
              <div className="value">{stats.companies}</div>
            </div>
            <div className="panel stat fade-up" style={{ animationDelay: '80ms' }}>
              <div className="label">Pagos ativos</div>
              <div className="value">{stats.activePaidTotal}</div>
            </div>
            <div className="panel stat fade-up" style={{ animationDelay: '120ms' }}>
              <div className="label">WA hoje</div>
              <div className="value">{waToday ?? '—'}</div>
            </div>
          </>
        )}
      </div>

      <div className="panel fade-up">
        <div className="toolbar">
          <strong>Top uso WhatsApp — {top?.day || 'hoje'}</strong>
          <Link to="/usage">abrir diário</Link>
        </div>

        {loading ? (
          <>
            <div className="desk-only">
              <TableSkeleton rows={6} cols={5} />
            </div>
            <div className="mobile-only">
              <div className="mobile-card-list">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="mobile-card" key={i} aria-hidden>
                    <span className="bone-shimmer" style={{ width: '60%', height: 16, borderRadius: 10, display: 'block' }} />
                    <span className="bone-shimmer" style={{ width: '40%', height: 12, borderRadius: 8, display: 'block', marginTop: 8 }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (top?.top || []).length === 0 ? (
          <EmptyState
            icon="chart"
            title="Sem uso de WhatsApp hoje"
            hint="Quando houver disparos no dia, o ranking aparece aqui."
            action={<Link to="/usage">Ver uso diário</Link>}
          />
        ) : (
          <>
            <div className="table-wrap desk-only">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Empresa</th>
                    <th>Total</th>
                    <th>Meta</th>
                    <th>Baileys BC</th>
                  </tr>
                </thead>
                <tbody>
                  {top!.top.map((row) => (
                    <tr key={`${row.companyId}-${row.userId}`}>
                      <td>
                        <Link to={`/accounts/${row.userId}`}>
                          {row.userEmail || row.userId.slice(0, 8)}
                        </Link>
                        <div className="muted">{row.userName || '—'}</div>
                      </td>
                      <td>
                        {row.companyId ? (
                          <Link to={`/companies/${row.companyId}`}>
                            {row.companyName || row.companyId.slice(0, 8)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="mono">{row.total}</td>
                      <td className="mono">
                        {row.metaUsed}
                        {row.metaLimit != null ? ` / ${row.metaLimit}` : ''}
                      </td>
                      <td className="mono">{row.byCategory.baileys_broadcast || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list mobile-only">
              {top!.top.map((row) => (
                <Link
                  key={`${row.companyId}-${row.userId}`}
                  to={`/accounts/${row.userId}`}
                  className="mobile-card"
                  style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                >
                  <div className="mobile-card-title">
                    {row.userEmail || row.userId.slice(0, 8)}
                  </div>
                  <div className="mobile-card-sub">{row.userName || '—'}</div>
                  <div className="mobile-card-meta">
                    <span className="badge accent mono">{row.total} msgs</span>
                    <span className="meta-line">
                      Meta {row.metaUsed}
                      {row.metaLimit != null ? `/${row.metaLimit}` : ''}
                    </span>
                    {row.companyId && (
                      <span className="meta-line">
                        {row.companyName || row.companyId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
