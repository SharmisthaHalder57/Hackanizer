import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";
import { ParticipantDashboard } from "./pages/ParticipantDashboard";
import { MentorDashboard } from "./pages/MentorDashboard";
import { JudgeDashboard } from "./pages/JudgeDashboard";
import { VolunteerDashboard } from "./pages/VolunteerDashboard";
import { LiveHeatmap } from "./pages/LiveHeatmap";
import { AnonymousFeedback } from "./pages/AnonymousFeedback";
import { ReportsAnalytics } from "./pages/ReportsAnalytics";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/organizer",
    Component: OrganizerDashboard,
  },
  {
    path: "/participant",
    Component: ParticipantDashboard,
  },
  {
    path: "/mentor",
    Component: MentorDashboard,
  },
  {
    path: "/judge",
    Component: JudgeDashboard,
  },
  {
    path: "/volunteer",
    Component: VolunteerDashboard,
  },
  {
    path: "/heatmap",
    Component: LiveHeatmap,
  },
  {
    path: "/feedback",
    Component: AnonymousFeedback,
  },
  {
    path: "/reports",
    Component: ReportsAnalytics,
  },
]);
