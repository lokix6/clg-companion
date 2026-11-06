import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { studentRecentQuery, studentSummaryQuery } from "@/features/attendance/sprint2Queries";

export const Route = createFileRoute("/_authenticated/dashboard/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentAttendancePage,
});

function bandClasses(p: number) {
  if (p >= 75) return { label: "On track", badge: "bg-success/15 text-success border-success/30", bar: "[&>div]:bg-success" };
  if (p >= 60) return { label: "Needs attention", badge: "bg-warning/15 text-warning border-warning/30", bar: "[&>div]:bg-warning" };
  return { label: "Critical", badge: "bg-destructive/10 text-destructive border-destructive/30", bar: "[&>div]:bg-destructive" };
}

function StudentAttendancePage() {
  const summary = useQuery(studentSummaryQuery());
  const recent = useQuery(studentRecentQuery(50));

  const totals = useMemo(() => {
    const rows = summary.data ?? [];
    const t = rows.reduce((s, r) => s + r.total_classes, 0);
    const p = rows.reduce((s, r) => s + r.present_count, 0);
    const a = rows.reduce((s, r) => s + r.absent_count, 0);
    const avg = rows.length ? rows.reduce((s, r) => s + r.percentage, 0) / rows.length : 0;
    const overall = t ? Math.round((p / t) * 1000) / 10 : 0;
    const sorted = [...rows].sort((x, y) => y.percentage - x.percentage);
    return {
      total: t,
      present: p,
      absent: a,
      overall,
      average: Math.round(avg * 10) / 10,
      highest: sorted[0],
      lowest: sorted[sorted.length - 1],
      below: rows.filter((r) => r.percentage < 75),
    };
  }, [summary.data]);

  const rows = summary.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your attendance is marked by faculty and updates automatically."
      />

      {summary.isLoading ? (
        <LoadingState label="Loading attendance…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance yet"
          description="Once your faculty starts marking attendance, your records will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overall</div>
              <div className="mt-1 text-3xl font-bold">{totals.overall.toFixed(1)}%</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {totals.present} of {totals.total} classes
              </div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Present</div>
              <div className="mt-1 text-3xl font-bold text-success">{totals.present}</div>
              <div className="mt-1 text-xs text-muted-foreground">Across {rows.length} subject{rows.length === 1 ? "" : "s"}</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Absent</div>
              <div className="mt-1 text-3xl font-bold text-destructive">{totals.absent}</div>
            </InfoCard>
            <InfoCard>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Best / worst</div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="truncate">{totals.highest?.subject_name ?? "—"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{totals.highest?.percentage.toFixed(1)}%</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-sm">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                <span className="truncate">{totals.lowest?.subject_name ?? "—"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{totals.lowest?.percentage.toFixed(1)}%</span>
              </div>
            </InfoCard>
          </div>

          {totals.below.length > 0 && (
            <InfoCard className="border-warning/40 bg-warning/5">
              <div className="text-sm font-semibold">
                {totals.below.length} subject{totals.below.length === 1 ? "" : "s"} below 75%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {totals.below.map((s) => `${s.subject_name} (${s.percentage.toFixed(1)}%)`).join(" • ")}
              </div>
            </InfoCard>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const style = bandClasses(r.percentage);
              return (
                <div key={r.catalog_subject_id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.subject_name ?? "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.subject_code ?? "—"}</div>
                    </div>
                    <Badge variant="outline" className={cn("font-medium", style.badge)}>{style.label}</Badge>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold">{r.percentage.toFixed(1)}%</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {r.present_count} of {r.total_classes} classes
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Present: <span className="text-success font-semibold">{r.present_count}</span></div>
                      <div>Absent: <span className="text-destructive font-semibold">{r.absent_count}</span></div>
                    </div>
                  </div>
                  <Progress value={Math.min(r.percentage, 100)} className={cn("mt-3 h-2", style.bar)} />
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Recent attendance</div>
            {recent.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (recent.data ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No history yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {(recent.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.subject_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(`${r.class_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    {r.status === "Present" ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/20">Present</Badge>
                    ) : (
                      <Badge variant="destructive">Absent</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
