import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  getSecret,
  getToken,
  setSecret,
  setToken,
  setUsername,
} from '../lib/session';

export default function AuthPage() {
  const nav = useNavigate();
  const [secret, setSecretInput] = useState(getSecret());
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) nav('/', { replace: true });
  }, [nav]);

  async function refreshStatus(currentSecret = secret) {
    setSecret(currentSecret);
    try {
      const st = await api<{ bootstrapped: boolean }>(
        '/auth/status',
        {},
        { auth: false },
      );
      setBootstrapped(st.bootstrapped);
      setError('');
    } catch (e) {
      setBootstrapped(null);
      setError(e instanceof Error ? e.message : 'Falha ao falar com a API');
    }
  }

  useEffect(() => {
    if (secret) void refreshStatus(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSecret(secret);
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
    setSecret(secret);
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
      setBootstrapped(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap falhou');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <h1>admin-istabus</h1>
        <p className="muted">Acesso exclusivo com secret + login único.</p>

        <div className="stack">
          <label className="muted">ADMIN_ACCESS_SECRET</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="cole o secret da API"
          />
          <button
            type="button"
            className="secondary"
            onClick={() => refreshStatus(secret)}
          >
            Validar secret / status
          </button>
        </div>

        {bootstrapped === false && (
          <form className="stack" onSubmit={onBootstrap}>
            <label className="muted">ADMIN_BOOTSTRAP_SECRET (1ª vez)</label>
            <input
              type="password"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
            />
            <button disabled={loading || !secret}>Gerar meu login</button>
          </form>
        )}

        {creds && (
          <div className="success-box" style={{ marginTop: '1rem' }}>
            {`username: ${creds.username}\npassword: ${creds.password}\n\nGuarde agora. Não aparece de novo.`}
          </div>
        )}

        {(bootstrapped || creds) && (
          <form className="stack" onSubmit={onLogin}>
            <label className="muted">Usuário</label>
            <input value={username} onChange={(e) => setUser(e.target.value)} />
            <label className="muted">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={loading || !secret}>Entrar</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
