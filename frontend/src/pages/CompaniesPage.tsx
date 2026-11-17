import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Row = {
  id: string;
  name: string;
  createdAt: string;
  plan: {
    stripeProductId: string | null;
    stripeSubscriptionStatus: string | null;
  };
  quotas: { whatsappBroadcastMetaLimit: number | null };
  members: Array<{ id: string; email: string }>;
};

export default function CompaniesPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  async function load(query = q) {
    try {
      setRows(
        await api<Row[]>(
          `/accounts/companies${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        ),
      );
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
      <h2 style={{ marginTop: 0 }}>Empresas</h2>
      <form className="toolbar" onSubmit={onSearch}>
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar empresa"
        />
        <button>Buscar</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Membros</th>
              <th>Plano</th>
              <th>WA Meta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td className="mono">{r.members.length}</td>
                <td>
                  <span
                    className={`badge ${
                      r.plan.stripeSubscriptionStatus === 'active' ? 'ok' : ''
                    }`}
                  >
                    {r.plan.stripeSubscriptionStatus || 'free'}
                  </span>
                  <div className="mono muted">{r.plan.stripeProductId || '—'}</div>
                </td>
                <td className="mono">
                  {r.quotas.whatsappBroadcastMetaLimit ?? 'null→free'}
                </td>
                <td>
                  <Link to={`/companies/${r.id}`}>abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
