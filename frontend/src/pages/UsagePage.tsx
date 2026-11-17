import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Daily = {
  day: string;
  totalMessages: number;
  accounts: Array<{
    companyId: string | null;
    userId: string;
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }>;
};

export default function UsagePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Daily | null>(null);
  const [error, setError] = useState('');

  async function load(d = date) {
    try {
      setData(await api<Daily>(`/usage/daily?date=${encodeURIComponent(d)}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    void load(date);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(date);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Uso diário WhatsApp</h2>
      <form className="toolbar" onSubmit={onSubmit}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button>Carregar</button>
        <span className="muted">total: {data?.totalMessages ?? '—'}</span>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Company</th>
              <th>Total</th>
              <th>Categories</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.accounts || []).map((row) => (
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
                <td className="mono">
                  {Object.entries(row.byCategory)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' · ')}
                </td>
                <td className="mono">
                  {Object.entries(row.byStatus)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
