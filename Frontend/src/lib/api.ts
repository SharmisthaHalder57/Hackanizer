// ==========================================
// API BASE URL
// ==========================================
// Vite proxies /api → http://localhost:5000 (Flask gateway) in dev mode.

const BASE = '/api';

// ==========================================
// TOKEN HELPERS
// ==========================================

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
}

// ==========================================
// HTTP CLIENT
// ==========================================

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ==========================================
// AUTH TYPES
// ==========================================

export interface UserData {
  id: number;
  full_name: string;
  email: string;
  role: 'participant' | 'mentor' | 'judge' | 'volunteer' | 'organizer';
  skills?: string | null;
  photo_url?: string | null;
  current_room?: string | null;
  is_active: boolean;
}

export interface AuthResponse {
  user: UserData;
  token: {
    access_token: string;
    token_type: string;
  };
}

// ==========================================
// AUTH API
// ==========================================

export const auth = {
  /**
   * Exchange a Firebase Google ID token for our app JWT.
   * Called after signInWithGoogle() succeeds on the frontend.
   */
  googleLogin: (data: {
    id_token: string;
    role: UserData['role'];
    skills?: string;
  }) =>
    request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get current user profile (requires Bearer token) */
  me: () => request<UserData>('/auth/me'),
};

// ==========================================
// GENERIC API HELPER (for dashboard pages)
// ==========================================

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ==========================================
// QUERIES TYPES & API
// ==========================================

export type QueryStatus = 'pending' | 'assigned' | 'in-progress' | 'resolved';
export type TargetType  = 'mentor' | 'judge' | 'volunteer';

export interface QueryItem {
  id: string;
  participant_id: string;
  target_type: TargetType;
  skill: string | null;
  message: string;
  status: QueryStatus;
  assigned_to_id: string | null;
  created_at: string;          // ISO string from backend
  participant_name: string | null;
  assigned_to_name: string | null;
}

export const queries = {
  /** Participant submits a new help request */
  create: (body: { target_type: TargetType; skill?: string; message: string }) =>
    request<QueryItem>('/queries', { method: 'POST', body: JSON.stringify(body) }),

  /** All queries submitted by the current participant */
  mine: () => request<QueryItem[]>('/queries/me'),

  /** All queries assigned to the current mentor/volunteer/judge */
  assigned: () => request<QueryItem[]>('/queries/assigned'),

  /** All queries — organiser only */
  all: () => request<QueryItem[]>('/queries'),

  /** Update a query's status (mentor resolves, starts helping, etc.) */
  updateStatus: (id: string, body: { status: QueryStatus; assigned_to_id?: string }) =>
    request<QueryItem>(`/queries/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
};
