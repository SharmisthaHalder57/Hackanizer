/**
 * ProtectedRoute.tsx
 *
 * Guards dashboard routes from unauthorized access by verifying:
 *   1. A JWT token exists in localStorage
 *   2. The user's stored role matches the required role for this route
 *   3. A hackathon_id is set (user completed the full login flow)
 *
 * Redirects to "/" (login) if any check fails, preserving the intended URL
 * in state so the login page can redirect back after authentication.
 */
import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { getToken } from '../../lib/api';

type Role = 'participant' | 'mentor' | 'judge' | 'volunteer' | 'organizer';

interface Props {
  /** The role(s) allowed to access this route. */
  requiredRole: Role | Role[];
  children: ReactNode;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function ProtectedRoute({ requiredRole, children }: Props) {
  const location = useLocation();
  const token = getToken();

  // 1. No token at all → back to login
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Local (non-JWT) tokens issued by the quick-login flow
  //    They start with "local-jwt-" and don't carry role/hackathon in payload.
  //    We fall back to localStorage for these.
  let userRole: string | null = null;
  let hackathonId: string | null = null;

  if (token.startsWith('local-jwt-')) {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        userRole = parsed.userType ?? parsed.role ?? null;
      } catch { /* ignore */ }
    }
    hackathonId = localStorage.getItem('hackathonId');
  } else {
    // Real JWT — decode payload
    const payload = parseJwtPayload(token);
    if (!payload) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    userRole    = payload.role as string ?? null;
    hackathonId = payload.hackathon_id as string ?? null;
  }

  // 3. Must have a hackathon selected
  if (!hackathonId) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 4. Role check
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!userRole || !allowed.includes(userRole as Role)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Convenience guard for any authenticated user (no specific role required). */
export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = getToken();

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const hackathonId =
    token.startsWith('local-jwt-')
      ? localStorage.getItem('hackathonId')
      : (parseJwtPayload(token)?.hackathon_id as string | undefined) ?? null;

  if (!hackathonId) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
