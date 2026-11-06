import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/reports/ReportsPage";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: () => (
    <ReportsPage
      role="student"
      title="Reports"
      description="Download your academic reports."
    />
  ),
});
