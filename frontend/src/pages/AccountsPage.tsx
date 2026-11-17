import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Row = {
  userId: string;
  email: string;
  name: string | null;
  status: string;
  company: { id: string; name: string } | null;
  plan: {
    stripeProductId: string | null;
    stripeSubscriptionStatus: string | null;
    scope: string;
  };
  quotas: {
    whatsappBroadcastMetaLimit: number | null;
    feedUsed: number;
    geniaUsed: number;
  };
};

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  async function load(query = q) {
    try {
      const data = await api<Row[]>(
        `/accounts${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      setRows(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  useEffect(() => {
    void load('');
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load(q);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Contas</h2>
      <form className="toolbar" onSubmit={onSearch}>
        <input
          style={{ flex: 1 }}
          placeholder="buscar email, nome, empresa"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Empresa</th>
              <th>Status plano</th>
              <th>Product</th>
              <th>WA Meta lim</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>
                  <div>{r.email}</div>
                  <div className="muted">{r.name || r.status}</div>
                </td>
                <td>
                  {r.company ? (
                    <Link to={`/companies/${r.company.id}`}>{r.company.name}</Link>
                  ) : (
                    <span className="muted">pessoal</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      r.plan.stripeSubscriptionStatus === 'active' ? 'ok' : ''
                    }`}
                  >
                    {r.plan.stripeSubscriptionStatus || 'free'} · {r.plan.scope}
                  </span>
                </td>
                <td className="mono">{r.plan.stripeProductId || '—'}</td>
                <td className="mono">
                  {r.quotas.whatsappBroadcastMetaLimit ?? 'null→free'}
                </td>
                <td>
                  <Link to={`/accounts/${r.userId}`}>abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
