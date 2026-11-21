const TOKEN_KEY = 'admin_istabus_token';
const SECRET_KEY = 'admin_istabus_secret';
const USER_KEY = 'admin_istabus_user';

const ENV_SECRET = (
  (import.meta.env.VITE_ADMIN_ACCESS_SECRET as string | undefined) || ''
).trim();

export function hasEnvSecret() {
  return ENV_SECRET.length > 0;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Preferência: secret de build (Vercel). Fallback: localStorage (dev). */
export function getSecret() {
  if (ENV_SECRET) return ENV_SECRET;
  return localStorage.getItem(SECRET_KEY) || '';
}

export function setSecret(secret: string) {
  if (ENV_SECRET) return; // não sobrescreve secret de ambiente
  localStorage.setItem(SECRET_KEY, secret);
}

export function clearSecret() {
  localStorage.removeItem(SECRET_KEY);
}

export function getUsername() {
  return localStorage.getItem(USER_KEY) || '';
}

export function setUsername(username: string) {
  localStorage.setItem(USER_KEY, username);
}

export function logout() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}
