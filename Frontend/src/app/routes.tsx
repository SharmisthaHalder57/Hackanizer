/**
 * routes.tsx — Application routing with role-based protected routes.
 *
 * Multi-tenant update: all dashboard routes are now wrapped in ProtectedRoute
 * which validates the JWT token, role, and hackathon_id before rendering.
 * Unauthenticated or wrong-role users are redirected to "/" (login).
 */
import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { MentorDashboard } from './pages/MentorDashboard';
import { JudgeDashboard } from './pages/JudgeDashboard';
import { VolunteerDashboard } from './pages/VolunteerDashboard';
import { LiveHeatmap } from './pages/LiveHeatmap';
import { AnonymousFeedback } from './pages/AnonymousFeedback';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { ProtectedRoute, AuthenticatedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  // ─── Public ─────────────────────────────────────────────────────────────────
  {
    path: '/',
    Component: Login,
  },
  // Feedback is intentionally public — no auth barrier
  {
    path: '/feedback',
    Component: AnonymousFeedback,
  },

  // ─── Role-Gated Dashboards ───────────────────────────────────────────────────
  {
    path: '/organizer',
    element: (
      <ProtectedRoute requiredRole="organizer">
        <OrganizerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/participant',
    element: (
      <ProtectedRoute requiredRole="participant">
        <ParticipantDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mentor',
    element: (
      <ProtectedRoute requiredRole="mentor">
        <MentorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/judge',
    element: (
      <ProtectedRoute requiredRole="judge">
        <JudgeDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/volunteer',
    element: (
      <ProtectedRoute requiredRole="volunteer">
        <VolunteerDashboard />
      </ProtectedRoute>
    ),
  },

  // ─── Authenticated (any role) ─────────────────────────────────────────────
  {
    path: '/heatmap',
    element: (
      <AuthenticatedRoute>
        <LiveHeatmap />
      </AuthenticatedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <AuthenticatedRoute>
        <ReportsAnalytics />
      </AuthenticatedRoute>
    ),
  },
]);
