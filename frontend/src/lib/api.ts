import { getSecret, getToken, logout } from './session';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

/** Únicas rotas que podem ser chamadas sem Bearer JWT. */
const PUBLIC_API_PATHS = new Set(['/auth/login', '/auth/bootstrap']);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizePath(path: string): string {
  const bare = path.split('?')[0] || path;
  return bare.startsWith('/') ? bare : `/${bare}`;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  opts?: { auth?: boolean },
): Promise<T> {
  const cleanPath = normalizePath(path);
  const requireAuth = opts?.auth !== false && !PUBLIC_API_PATHS.has(cleanPath);

  const secret = getSecret();
  if (!secret) {
    throw new ApiError(401, 'ADMIN_ACCESS_SECRET ausente');
  }

  if (requireAuth && !getToken()) {
    logout();
    throw new ApiError(401, 'Sessão de admin necessária');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Admin-Secret', secret);

  if (requireAuth || opts?.auth !== false) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    logout();
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body &&
      'message' in body &&
      (body as { message: unknown }).message
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message).join(', ')
          : String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}
