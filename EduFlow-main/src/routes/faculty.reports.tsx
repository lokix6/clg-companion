import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/reports/ReportsPage";

export const Route = createFileRoute("/faculty/reports")({
  component: () => (
    <ReportsPage
      role="faculty"
      title="Reports"
      description="Reports scoped to your subjects and students."
    />
  ),
});
