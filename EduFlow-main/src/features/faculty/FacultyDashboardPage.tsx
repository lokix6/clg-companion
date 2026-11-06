import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Megaphone,
  NotebookPen,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminStatCard } from "@/features/admin/AdminStatCard";
import { facultyMyStatsQueryOptions } from "@/features/faculty/queries";
import { facultyDashboardAttnQuery } from "@/features/attendance/sprint2Queries";
import { useAuth } from "@/lib/auth/AuthProvider";

export function FacultyDashboardPage() {
  const { profile, user } = useAuth();
  const stats = useQuery(facultyMyStatsQueryOptions());
  const attn = useQuery(facultyDashboardAttnQuery());
  const s = stats.data;
  const a = attn.data;
  const name = profile?.full_name || user?.email?.split("@")[0] || "Faculty";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Your subjects, students and content — everything you own on EduFlow."
      />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Assigned subjects" value={s?.assigned_subjects ?? 0} icon={BookOpen} />
        <AdminStatCard label="Students" value={a?.total_students ?? s?.total_students ?? 0} icon={Users} />
        <AdminStatCard label="Attendance today (done)" value={a?.attendance_completed_today ?? 0} icon={CheckCircle2} />
        <AdminStatCard label="Attendance pending" value={a?.attendance_pending_today ?? 0} icon={Clock} />
        <AdminStatCard label="Assignments" value={s?.assignments_created ?? 0} icon={ClipboardList} />
        <AdminStatCard label="Notes" value={s?.notes_uploaded ?? 0} icon={NotebookPen} />
        <AdminStatCard label="Announcements" value={s?.announcements ?? 0} icon={Megaphone} />
        <AdminStatCard label="Upcoming events" value={s?.upcoming_events ?? 0} icon={CalendarDays} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent attendance sessions</h2>
          <Link to="/faculty/attendance" className="text-xs text-primary hover:underline">
            Mark attendance →
          </Link>
        </div>
        {(a?.recent_sessions ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sessions yet — mark your first attendance.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(a?.recent_sessions ?? []).map((r) => (
              <li key={`${r.catalog_subject_id}-${r.class_date}`} className="flex items-center justify-between py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-medium">{r.subject_name}</span>
                  <span className="text-xs text-muted-foreground">
                    · {new Date(`${r.class_date}T00:00:00`).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {r.present}/{r.total} present
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-sm font-semibold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link to="/faculty/subjects" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">My subjects</Link>
          <Link to="/faculty/attendance" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Mark attendance</Link>
          <Link to="/faculty/notes" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Upload note</Link>
          <Link to="/faculty/assignments" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">New assignment</Link>
          <Link to="/faculty/announcements" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Post announcement</Link>
        </div>
      </section>
    </div>
  );
}