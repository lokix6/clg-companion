import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Megaphone,
  CalendarDays,
  NotebookPen,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminStatCard } from "@/features/admin/AdminStatCard";
import { ActivityTimeline } from "@/features/admin/ActivityTimeline";
import {
  adminActivityQueryOptions,
  adminStatsQueryOptions,
} from "@/features/admin/queries";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const stats = useQuery(adminStatsQueryOptions());
  const activity = useQuery(adminActivityQueryOptions(15));

  const s = stats.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Platform overview of students, academics, and campus activity."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Students"
          value={stats.isLoading ? "…" : (s?.total_students ?? 0)}
          hint={s ? `${s.recent_registrations} new this week` : undefined}
          icon={Users}
        />
        <AdminStatCard
          label="Active Students"
          value={stats.isLoading ? "…" : (s?.active_students ?? 0)}
          hint={s ? `${s.inactive_students} inactive` : undefined}
          icon={UserCheck}
          accent="success"
        />
        <AdminStatCard
          label="Total Subjects"
          value={stats.isLoading ? "…" : (s?.total_subjects ?? 0)}
          icon={BookOpen}
          accent="muted"
        />
        <AdminStatCard
          label="Assignments"
          value={stats.isLoading ? "…" : (s?.total_assignments ?? 0)}
          hint={s ? `${s.completed_assignments} completed` : undefined}
          icon={ClipboardList}
          accent="muted"
        />
        <AdminStatCard
          label="Avg Attendance"
          value={stats.isLoading ? "…" : `${s?.average_attendance ?? 0}%`}
          icon={CalendarCheck}
          accent={
            (s?.average_attendance ?? 0) >= 75
              ? "success"
              : (s?.average_attendance ?? 0) >= 60
                ? "warning"
                : "muted"
          }
        />
        <AdminStatCard
          label="Announcements"
          value={stats.isLoading ? "…" : (s?.total_announcements ?? 0)}
          icon={Megaphone}
          accent="primary"
        />
        <AdminStatCard
          label="Upcoming Events"
          value={stats.isLoading ? "…" : (s?.upcoming_events ?? 0)}
          hint={s ? `${s.total_events} total` : undefined}
          icon={CalendarDays}
          accent="primary"
        />
        <AdminStatCard
          label="Notes Uploaded"
          value={stats.isLoading ? "…" : (s?.total_notes ?? 0)}
          icon={NotebookPen}
          accent="muted"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {activity.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ActivityTimeline items={activity.data ?? []} />
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">Platform health</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Attendance records" value={s?.total_attendance_records ?? 0} />
            <Row label="Unread notifications" value={s?.unread_notifications ?? 0} />
            <Row label="Assignments open" value={(s?.total_assignments ?? 0) - (s?.completed_assignments ?? 0)} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
