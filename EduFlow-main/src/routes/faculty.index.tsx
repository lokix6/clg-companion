import { createFileRoute } from "@tanstack/react-router";
import { FacultyDashboardPage } from "@/features/faculty/FacultyDashboardPage";

export const Route = createFileRoute("/faculty/")({
  component: FacultyDashboardPage,
});

