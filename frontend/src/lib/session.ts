const TOKEN_KEY = 'admin_istabus_token';
const SECRET_KEY = 'admin_istabus_secret';
const USER_KEY = 'admin_istabus_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSecret() {
  return localStorage.getItem(SECRET_KEY) || '';
}

export function setSecret(secret: string) {
  localStorage.setItem(SECRET_KEY, secret);
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
