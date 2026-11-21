import { useEffect, useState, type ReactNode } from 'react';
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { api } from './lib/api';
import { getToken, getUsername, logout, setUsername } from './lib/session';
import AccountsPage from './pages/AccountsPage';
import AuthPage from './pages/AuthPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import DashboardPage from './pages/DashboardPage';
import UsagePage from './pages/UsagePage';
import UserDetailPage from './pages/UserDetailPage';
import BroadcastHistoryPage from './pages/BroadcastHistoryPage';
import PurchasesPage from './pages/PurchasesPage';
import LoginsPage from './pages/LoginsPage';

const NAV = [
  { to: '/', label: 'Dashboard', end: true, icon: 'dash' as const },
  { to: '/accounts', label: 'Contas', end: false, icon: 'users' as const },
  { to: '/companies', label: 'Empresas', end: false, icon: 'building' as const },
  { to: '/usage', label: 'Uso diário', end: false, icon: 'chart' as const },
  { to: '/history', label: 'Histórico', end: false, icon: 'history' as const },
  { to: '/purchases', label: 'Compras', end: false, icon: 'card' as const },
  { to: '/logins', label: 'Logins', end: false, icon: 'key' as const },
];

function NavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const common = {
    className: 'nav-ico',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }
  if (name === 'building') {
    return (
      <svg {...common}>
        <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
        <path d="M14 9h5a1 1 0 0 1 1 1v11" />
        <path d="M8 9h.01" />
        <path d="M8 13h.01" />
        <path d="M8 17h.01" />
      </svg>
    );
  }
  if (name === 'chart') {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-7" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (name === 'card') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }
  if (name === 'key') {
    return (
      <svg {...common}>
        <circle cx="8" cy="15" r="4" />
        <path d="M11.5 12.5 20 4" />
        <path d="M16 4h4v4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <div className="mobile-topbar-inner">
          <button
            type="button"
            className="secondary icon-btn"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className="brand">
            admin-<span>istabus</span>
          </div>
          <span className="operator-chip">{getUsername() || 'operador'}</span>
        </div>
      </header>

      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navegação">
        <div className="brand desk-only">
          admin-<span>istabus</span>
        </div>
        <div className="operator-chip desk-only">{getUsername() || 'operador'}</div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}>
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="secondary"
          style={{ marginTop: 'auto' }}
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          Sair
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

/** Layout autenticado: valida JWT no servidor uma vez e bloqueia o app inteiro. */
function PrivateLayout() {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!getToken()) {
        if (!cancelled) {
          setOk(false);
          setReady(true);
        }
        return;
      }
      try {
        const me = await api<{ username: string }>('/auth/me');
        if (!cancelled) {
          if (me.username) setUsername(me.username);
          setOk(true);
          setReady(true);
        }
      } catch {
        logout();
        if (!cancelled) {
          setOk(false);
          setReady(true);
        }
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="auth-wrap">
        <div className="muted">Validando sessão admin…</div>
      </div>
    );
  }
  if (!ok) return <Navigate to="/login" replace />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<PrivateLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/accounts/:id" element={<UserDetailPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route path="/history" element={<BroadcastHistoryPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/logins" element={<LoginsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
