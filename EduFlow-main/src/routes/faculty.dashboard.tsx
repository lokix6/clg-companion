import { createFileRoute } from "@tanstack/react-router";
import { FacultyDashboardPage } from "@/features/faculty/FacultyDashboardPage";

export const Route = createFileRoute("/faculty/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FacultyDashboardPage,
});