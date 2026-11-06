import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});

type Row = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

function AdminNotificationsPage() {
  const q = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at, profile:profiles!notifications_student_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Latest notifications delivered across the platform." />
      {q.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (q.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="Notifications will appear as they are triggered." />
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((n) => (
            <li key={n.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {n.type} · {n.profile?.full_name ?? n.profile?.email ?? "user"}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{n.message}</p>
                </div>
                <div className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
