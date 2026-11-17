import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { getToken, getUsername, logout } from './lib/session';
import AccountsPage from './pages/AccountsPage';
import AuthPage from './pages/AuthPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import DashboardPage from './pages/DashboardPage';
import UsagePage from './pages/UsagePage';
import UserDetailPage from './pages/UserDetailPage';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          admin-<span>istabus</span>
        </div>
        <div className="muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          {getUsername() || 'operador'}
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/accounts">Contas</NavLink>
          <NavLink to="/companies">Empresas</NavLink>
          <NavLink to="/usage">Uso diário</NavLink>
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

function Private({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <Private>
            <DashboardPage />
          </Private>
        }
      />
      <Route
        path="/accounts"
        element={
          <Private>
            <AccountsPage />
          </Private>
        }
      />
      <Route
        path="/accounts/:id"
        element={
          <Private>
            <UserDetailPage />
          </Private>
        }
      />
      <Route
        path="/companies"
        element={
          <Private>
            <CompaniesPage />
          </Private>
        }
      />
      <Route
        path="/companies/:id"
        element={
          <Private>
            <CompanyDetailPage />
          </Private>
        }
      />
      <Route
        path="/usage"
        element={
          <Private>
            <UsagePage />
          </Private>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
