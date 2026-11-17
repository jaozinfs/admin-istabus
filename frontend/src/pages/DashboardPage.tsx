import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    userId: string;
    total: number;
    byCategory: Record<string, number>;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [top, setTop] = useState<Top | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Stats>('/accounts/stats'),
      api<Top>('/usage/top-today?limit=15'),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTop(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid-stats">
        <div className="panel stat">
          <div className="label">Usuários</div>
          <div className="value">{stats?.users ?? '—'}</div>
        </div>
        <div className="panel stat">
          <div className="label">Empresas</div>
          <div className="value">{stats?.companies ?? '—'}</div>
        </div>
        <div className="panel stat">
          <div className="label">Pagos ativos</div>
          <div className="value">{stats?.activePaidTotal ?? '—'}</div>
        </div>
        <div className="panel stat">
          <div className="label">WA hoje</div>
          <div className="value">
            {top ? top.top.reduce((s, a) => s + a.total, 0) : '—'}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <strong>Top uso WhatsApp — {top?.day || 'hoje'}</strong>
          <Link to="/usage">ver diário</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Company</th>
              <th>Total</th>
              <th>Meta</th>
              <th>Baileys BC</th>
            </tr>
          </thead>
          <tbody>
            {(top?.top || []).map((row) => (
              <tr key={`${row.companyId}-${row.userId}`}>
                <td className="mono">
                  <Link to={`/accounts/${row.userId}`}>{row.userId.slice(0, 8)}</Link>
                </td>
                <td className="mono">
                  {row.companyId ? (
                    <Link to={`/companies/${row.companyId}`}>
                      {row.companyId.slice(0, 8)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mono">{row.total}</td>
                <td className="mono">{row.byCategory.meta_broadcast || 0}</td>
                <td className="mono">{row.byCategory.baileys_broadcast || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
