import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/reports/ReportsPage";

export const Route = createFileRoute("/admin/reports")({
  component: () => (
    <ReportsPage
      role="admin"
      title="Reports"
      description="Generate, preview and export platform-wide reports."
    />
  ),
});
