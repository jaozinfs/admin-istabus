import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { EffectiveQuotas, PlanInfo } from '../lib/types';

type Row = {
  id: string;
  name: string;
  createdAt: string;
  plan: PlanInfo;
  quotasEffective: EffectiveQuotas;
  members: Array<{ id: string; email: string }>;
};

export default function CompaniesPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function load(query = q) {
    setLoading(true);
    try {
      setRows(
        await api<Row[]>(
          `/accounts/companies${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        ),
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
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
      <h1 className="page-title">Empresas</h1>
      <p className="page-sub">Billing da empresa + membros / subcontas</p>
      <form className="toolbar" onSubmit={onSearch}>
        <input
          style={{ flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar empresa"
        />
        <button disabled={loading}>{loading ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Membros</th>
              <th>Plano</th>
              <th>WA Meta efetivo</th>
              <th>GenIA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="row-click"
                onClick={() => nav(`/companies/${r.id}`)}
              >
                <td>
                  <Link to={`/companies/${r.id}`} onClick={(e) => e.stopPropagation()}>
                    {r.name}
                  </Link>
                  <div className="muted">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="mono">{r.members.length}</td>
                <td>
                  <span className={`badge ${r.plan.active ? 'ok' : ''}`}>
                    {r.plan.active ? 'ativo' : 'free'}
                  </span>
                  <div className="mono muted">{r.plan.stripeProductId || '—'}</div>
                </td>
                <td className="mono">
                  {r.quotasEffective.whatsappBroadcastMetaLimit}
                </td>
                <td className="mono">
                  {r.quotasEffective.geniaUsed}/{r.quotasEffective.geniaLimit}
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/companies/${r.id}#relatorio`);
                    }}
                  >
                    Relatório
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
