import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminStatCard } from "@/features/admin/AdminStatCard";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Megaphone,
  NotebookPen,
  UserCheck,
  Users,
} from "lucide-react";
import {
  adminAttendanceTrendQueryOptions,
  adminStatsQueryOptions,
} from "@/features/admin/queries";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const stats = useQuery(adminStatsQueryOptions());
  const trend = useQuery(adminAttendanceTrendQueryOptions());
  const s = stats.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Aggregate platform metrics across all students, subjects, and campus modules."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Students" value={s?.total_students ?? 0} icon={Users} />
        <AdminStatCard
          label="Active"
          value={s?.active_students ?? 0}
          icon={UserCheck}
          accent="success"
        />
        <AdminStatCard
          label="Avg Attendance"
          value={`${s?.average_attendance ?? 0}%`}
          icon={CalendarCheck}
          accent={
            (s?.average_attendance ?? 0) >= 75
              ? "success"
              : (s?.average_attendance ?? 0) >= 60
                ? "warning"
                : "muted"
          }
        />
        <AdminStatCard label="Subjects" value={s?.total_subjects ?? 0} icon={BookOpen} />
        <AdminStatCard
          label="Assignments"
          value={s?.total_assignments ?? 0}
          hint={`${s?.completed_assignments ?? 0} completed`}
          icon={ClipboardList}
        />
        <AdminStatCard label="Notes" value={s?.total_notes ?? 0} icon={NotebookPen} />
        <AdminStatCard
          label="Announcements"
          value={s?.total_announcements ?? 0}
          icon={Megaphone}
        />
        <AdminStatCard
          label="Upcoming events"
          value={s?.upcoming_events ?? 0}
          icon={CalendarDays}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">Attendance trend (last 30 days)</h2>
        {trend.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading trend…</div>
        ) : (trend.data?.length ?? 0) === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No attendance history yet.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.data ?? []}>
                <defs>
                  <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "Attendance"]}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#attFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
