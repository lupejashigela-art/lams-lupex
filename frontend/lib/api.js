const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lams-lupex-production.up.railway.app/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lams_token');
}

export function setAuth(token, user) {
  localStorage.setItem('lams_token', token);
  localStorage.setItem('lams_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('lams_token');
  localStorage.removeItem('lams_user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('lams_user');
  return raw ? JSON.parse(raw) : null;
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Invalid or expired token');
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function login(username, password) {
  clearAuth();

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  setAuth(data.token, data.user);
  return data;
}
