import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Administrator preferences and platform configuration." />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Account & preferences</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Notification, appearance and account settings are shared with your workspace.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/dashboard/settings">
              Open settings <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
