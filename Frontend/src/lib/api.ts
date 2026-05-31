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
    localStorage.removeItem('hackathonId');
}

export function getHackathonId(): string | null {
    return localStorage.getItem('hackathonId');
}

export function setHackathonId(id: string): void {
    localStorage.setItem('hackathonId', id);
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
// HACKATHON TYPES & API
// ==========================================

export interface HackathonData {
    id: string;
    name: string;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    location?: string | null;
    max_participants?: number | null;
    is_active: boolean;
    created_at: string;
    organizer_id?: string | null;
}

export const hackathons = {
    /** List all active hackathons — public, no auth needed */
    list: () => request<HackathonData[]>('/hackathons'),

    /** Get a specific hackathon by ID */
    get: (id: string) => request<HackathonData>(`/hackathons/${id}`),

    /** Create a new hackathon */
    create: (data: {
        name: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        location?: string;
        max_participants?: number;
        is_active?: boolean;
    }) => request<HackathonData>('/hackathons', { method: 'POST', body: JSON.stringify(data) }),
};

// ==========================================
// AUTH TYPES
// ==========================================

export interface UserData {
    id: number;
    full_name: string;
    email: string;
    role: 'participant' | 'mentor' | 'judge' | 'volunteer' | 'organizer';
    hackathon_id: string;
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
        hackathon_id: string;
    };
}

// ==========================================
// AUTH API
// ==========================================

export const auth = {
    /**
     * Exchange a Firebase Google ID token for our app JWT.
     * Now requires hackathon_id to scope the session.
     */
    googleLogin: (data: {
        id_token: string;
        role: UserData['role'];
        hackathon_id: string;
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
export type TargetType = 'mentor' | 'judge' | 'volunteer';

export interface QueryItem {
    id: string;
    participant_id: string;
    target_type: TargetType;
    skill: string | null;
    message: string;
    status: QueryStatus;
    assigned_to_id: string | null;
    created_at: string;
    participant_name: string | null;
    assigned_to_name: string | null;
}

export const queries = {
    create: (body: { target_type: TargetType; skill?: string; message: string }) =>
        request<QueryItem>('/queries', { method: 'POST', body: JSON.stringify(body) }),

    mine: () => request<QueryItem[]>('/queries/me'),

    assigned: () => request<QueryItem[]>('/queries/assigned'),

    all: () => request<QueryItem[]>('/queries'),

    updateStatus: (id: string, body: { status: QueryStatus; assigned_to_id?: string }) =>
        request<QueryItem>(`/queries/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ==========================================
// MEALS TYPES & API  ← NEW QR SECTION
// ==========================================

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealStatus {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
}

export interface MealQRResponse {
    meal_type: MealType;
    /** data:image/png;base64,... — plug directly into <img src> */
    qr_image: string;
    /** Raw token string embedded in the QR — send to POST /meals/claim/qr */
    token: string;
    /** How many seconds until this QR expires (default 300 = 5 min) */
    expires_in_seconds: number;
}

export interface MealStatsItem {
    meal_type: MealType;
    claimed: number;
    total_users: number;
}

export const meals = {
    /**
     * Get the current user's meal claim status.
     * Returns { breakfast: bool, lunch: bool, dinner: bool }
     */
    myStatus: () => request<MealStatus>('/meals/me'),

    /**
     * GET /api/meals/qr/{meal_type}
     *
     * Generate a QR code for a meal.
     * The QR is SHARED — all users see the same QR for the same meal+hackathon.
     * Tokens expire after 5 minutes.
     *
     * When to call: user presses the "Claim" button on a meal card.
     * Returns a base64 PNG QR image + raw token string.
     */
    getQR: (mealType: MealType) =>
        request<MealQRResponse>(`/meals/qr/${mealType}`),

    /**
     * POST /api/meals/claim/qr
     *
     * Claim a meal by submitting the token scanned from the QR code.
     * The token is verified server-side (signature + expiry).
     *
     * Body: { qr_token: string }
     *
     * When to call:
     *   - After the user scans the QR on their own device → token comes from
     *     the QR reader.
     *   - OR after the organizer station confirms the scan → the station sends
     *     the token to this endpoint on behalf of the user.
     *
     * Responses:
     *   200  { ok: true, meal_type: string }
     *   409  Already claimed
     *   410  QR expired — call getQR() again to refresh
     *   400  Invalid token
     */
    claimViaQR: (qrToken: string) =>
        request<{ ok: boolean; meal_type: MealType }>('/meals/claim/qr', {
            method: 'POST',
            body: JSON.stringify({ qr_token: qrToken }),
        }),

    /**
     * POST /api/meals/claim  (legacy / direct claim without QR)
     */
    claimDirect: (mealType: MealType) =>
        request<{ ok: boolean; meal_type: MealType }>('/meals/claim', {
            method: 'POST',
            body: JSON.stringify({ meal_type: mealType }),
        }),

    /**
     * GET /api/meals/stats  (organizer only)
     * Returns per-meal claimed counts and total user count.
     */
    stats: () => request<MealStatsItem[]>('/meals/stats'),
};