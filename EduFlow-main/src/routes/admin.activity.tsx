import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ActivityTimeline } from "@/features/admin/ActivityTimeline";
import { adminActivityQueryOptions } from "@/features/admin/queries";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivityPage,
});

function AdminActivityPage() {
  const q = useQuery(adminActivityQueryOptions(100));
  return (
    <div className="space-y-6">
      <PageHeader title="Activity log" description="Audit trail of administrative actions." />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Recent activity</h2>
        </div>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ActivityTimeline items={q.data ?? []} />
        )}
      </div>
    </div>
  );
}
