import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import {
  getSecret,
  getToken,
  hasEnvSecret,
  setSecret,
  setToken,
  setUsername,
} from '../lib/session';

export default function AuthPage() {
  const nav = useNavigate();
  const envLocked = hasEnvSecret();
  const [secret, setSecretInput] = useState(getSecret());
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) nav('/', { replace: true });
  }, [nav]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!envLocked) setSecret(secret);
    try {
      const res = await api<{ accessToken: string; username: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        { auth: false },
      );
      setToken(res.accessToken);
      setUsername(res.username);
      nav('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login falhou');
    } finally {
      setLoading(false);
    }
  }

  async function onBootstrap(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!envLocked) setSecret(secret);
    try {
      const res = await api<{ username: string; password: string }>(
        '/auth/bootstrap',
        {
          method: 'POST',
          body: JSON.stringify({ bootstrapSecret }),
        },
        { auth: false },
      );
      setCreds(res);
      setUser(res.username);
      setPassword(res.password);
      setShowBootstrap(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap falhou');
    } finally {
      setLoading(false);
    }
  }

  const secretReady = Boolean(getSecret() || secret);

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="auth-brand-mark" aria-hidden>
          ai
        </div>
        <h1>
          admin-<span style={{ color: 'var(--accent)' }}>istabus</span>
        </h1>
        <p className="muted">
          Acesso restrito: secret da API + login de operador admin.
        </p>

        {!envLocked && (
          <div className="stack">
            <label className="field-label">ADMIN_ACCESS_SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="cole o secret da API"
              autoComplete="off"
            />
          </div>
        )}

        {envLocked && (
          <span className="badge ok" style={{ marginTop: '0.75rem' }}>
            secret da API via ambiente
          </span>
        )}

        <form className="stack" onSubmit={onLogin}>
          <label className="field-label">Usuário admin</label>
          <input
            value={username}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="field-label">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button className="shiny" disabled={loading || !secretReady}>
            {loading ? <Spinner size={16} label="Entrando…" /> : 'Entrar'}
          </button>
        </form>

        {creds && (
          <div className="success-box" style={{ marginTop: '1rem' }}>
            {`username: ${creds.username}\npassword: ${creds.password}\n\nGuarde agora. Não aparece de novo.`}
          </div>
        )}

        <div style={{ marginTop: '1.1rem' }}>
          <button
            type="button"
            className="secondary"
            style={{ width: '100%' }}
            onClick={() => setShowBootstrap((v) => !v)}
          >
            {showBootstrap ? 'Ocultar bootstrap' : 'Primeiro acesso (bootstrap)'}
          </button>
        </div>

        {showBootstrap && (
          <form className="stack" onSubmit={onBootstrap}>
            <p className="hint">
              Só funciona uma vez, com ADMIN_BOOTSTRAP_SECRET. Depois fica
              bloqueado.
            </p>
            <label className="field-label">ADMIN_BOOTSTRAP_SECRET</label>
            <input
              type="password"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
              autoComplete="off"
              required
            />
            <button className="shiny" disabled={loading || !secretReady}>
              {loading ? (
                <Spinner size={16} label="Gerando…" />
              ) : (
                'Gerar login admin'
              )}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
