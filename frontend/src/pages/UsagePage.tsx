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

export default function UsagePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Daily | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    void load(date);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(date);
  }

  return (
    <div>
      <h1 className="page-title">Uso diário WhatsApp</h1>
      <p className="page-sub">
        Mensagens por conta no dia · nomes + cota efetiva Meta
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
              <tr key={`${row.companyId}-${row.userId}`} className="row-click">
                <td>
                  <Link to={`/accounts/${row.userId}`}>
                    {row.userEmail || row.userId.slice(0, 8)}
                  </Link>
                  <div className="muted">{row.userName || '—'}</div>
                </td>
                <td>
                  {row.companyId ? (
                    <>
                      <Link to={`/companies/${row.companyId}`}>
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
    </div>
  );
}
