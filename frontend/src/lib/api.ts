import { getSecret, getToken, logout } from './session';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  opts?: { auth?: boolean },
): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  const secret = getSecret();
  if (secret) headers.set('X-Admin-Secret', secret);
  if (opts?.auth !== false) {
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
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}
