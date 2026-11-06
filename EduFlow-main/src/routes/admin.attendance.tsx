import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarCheck, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminOverviewQuery, adminReportQuery } from "@/features/attendance/sprint2Queries";

export const Route = createFileRoute("/admin/attendance")({
  component: AdminAttendancePage,
});

function AdminAttendancePage() {
  const overview = useQuery(adminOverviewQuery());

  const depts = useQuery({
    queryKey: ["admin", "departments-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjectsQ = useQuery({
    queryKey: ["admin", "catalog-subjects-mini"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, subject_code, subject_name")
        .eq("is_catalog", true)
        .order("subject_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const facultyQ = useQuery({
    queryKey: ["admin", "faculty-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_faculty_options" as never);
      if (error) throw error;
      return (data as { id: string; full_name: string | null; email: string }[]) ?? [];
    },
  });

  const [f, setF] = useState<{
    department_id?: string;
    semester?: number;
    catalog_subject_id?: string;
    faculty_id?: string;
    from?: string;
    to?: string;
  }>({});

  const report = useQuery(adminReportQuery(f));

  const csv = useMemo(() => {
    const rows = report.data ?? [];
    const header = ["Date", "Student", "Subject", "Faculty", "Department", "Semester", "Status"];
    const body = rows.map((r) => [
      r.class_date,
      r.student_name ?? "",
      `${r.subject_code ?? ""} ${r.subject_name ?? ""}`.trim(),
      r.faculty_name ?? "",
      r.department_name ?? "",
      r.semester ?? "",
      r.status,
    ]);
    return [header, ...body]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }, [report.data]);

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ov = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Platform-wide attendance analytics across departments, faculty, and subjects."
      />

      {overview.isLoading ? (
        <LoadingState label="Loading analytics…" />
      ) : !ov || ov.total_records === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance data yet"
          description="Faculty haven't marked any attendance sessions yet."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overall</div>
              <div className="mt-1 text-3xl font-bold">{ov.overall_percentage.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{ov.total_records} records</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Departments</div>
              <div className="mt-1 text-3xl font-bold">{ov.by_department.filter((d) => d.total > 0).length}</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Faculty active</div>
              <div className="mt-1 text-3xl font-bold">{ov.by_faculty.length}</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subjects tracked</div>
              <div className="mt-1 text-3xl font-bold">{ov.by_subject.length}</div>
            </InfoCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="border-b border-border px-5 py-3 text-sm font-semibold">By department</div>
              <ul className="divide-y divide-border">
                {ov.by_department.filter((d) => d.total > 0).map((d) => (
                  <li key={d.id} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.present}/{d.total} · {d.pct}%
                      </span>
                    </div>
                    <Progress value={Math.min(d.pct, 100)} className="mt-2 h-1.5" />
                  </li>
                ))}
                {ov.by_department.filter((d) => d.total > 0).length === 0 && (
                  <li className="px-5 py-6 text-center text-sm text-muted-foreground">No data.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="border-b border-border px-5 py-3 text-sm font-semibold">By faculty</div>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {ov.by_faculty.map((fac) => (
                  <li key={fac.id} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{fac.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {fac.present}/{fac.total} · {fac.pct}%
                      </span>
                    </div>
                    <Progress value={Math.min(fac.pct, 100)} className="mt-2 h-1.5" />
                  </li>
                ))}
                {ov.by_faculty.length === 0 && (
                  <li className="px-5 py-6 text-center text-sm text-muted-foreground">No data.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-card lg:col-span-2">
              <div className="border-b border-border px-5 py-3 text-sm font-semibold">Subject-wise (lowest first)</div>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {ov.by_subject.map((s) => (
                  <li key={s.id} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">
                        {s.subject_name}
                        {s.subject_code ? ` (${s.subject_code})` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.present}/{s.total} · {s.pct}%
                      </span>
                    </div>
                    <Progress value={Math.min(s.pct, 100)} className="mt-2 h-1.5" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {ov.low_attendance_students.length > 0 && (
            <div className="rounded-2xl border border-warning/40 bg-warning/5 shadow-card">
              <div className="flex items-center gap-2 border-b border-warning/30 px-5 py-3 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> Low attendance students
              </div>
              <ul className="divide-y divide-border">
                {ov.low_attendance_students.map((st) => (
                  <li key={st.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{st.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {st.email} · {st.branch ?? "—"} · Sem {st.semester ?? "—"}
                      </div>
                    </div>
                    <Badge variant="destructive">{st.pct}% ({st.present}/{st.total})</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="text-sm font-semibold">Reports</div>
              <Button size="sm" variant="outline" onClick={download} disabled={(report.data ?? []).length === 0}>
                <Download className="mr-1 h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={f.department_id ?? "all"}
                onValueChange={(v) => setF((p) => ({ ...p, department_id: v === "all" ? undefined : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {(depts.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                value={f.semester ? String(f.semester) : "all"}
                onValueChange={(v) => setF((p) => ({ ...p, semester: v === "all" ? undefined : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                value={f.catalog_subject_id ?? "all"}
                onValueChange={(v) => setF((p) => ({ ...p, catalog_subject_id: v === "all" ? undefined : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {(subjectsQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={f.faculty_id ?? "all"}
                onValueChange={(v) => setF((p) => ({ ...p, faculty_id: v === "all" ? undefined : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Faculty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All faculty</SelectItem>
                  {(facultyQ.data ?? []).map((fac) => (
                    <SelectItem key={fac.id} value={fac.id}>{fac.full_name ?? fac.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={f.from ?? ""} onChange={(e) => setF((p) => ({ ...p, from: e.target.value || undefined }))} placeholder="From" />
              <Input type="date" value={f.to ?? ""} onChange={(e) => setF((p) => ({ ...p, to: e.target.value || undefined }))} placeholder="To" />
              <Button variant="ghost" size="sm" onClick={() => setF({})}>Clear</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Faculty</th>
                    <th className="p-3">Dept · Sem</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.isLoading ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                  ) : (report.data ?? []).length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No records match.</td></tr>
                  ) : (
                    (report.data ?? []).slice(0, 500).map((r) => (
                      <tr key={r.id} className="hover:bg-accent/40">
                        <td className="p-3 text-xs whitespace-nowrap">{r.class_date}</td>
                        <td className="p-3">{r.student_name ?? "—"}</td>
                        <td className="p-3">{r.subject_name ?? "—"}</td>
                        <td className="p-3">{r.faculty_name ?? "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {r.department_name ?? "—"} · Sem {r.semester ?? "—"}
                        </td>
                        <td className="p-3">
                          {r.status === "Present" ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/20">Present</Badge>
                          ) : (
                            <Badge variant="destructive">Absent</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {(report.data ?? []).length > 500 && (
                <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
                  Showing first 500 rows — refine filters or export CSV for the full set.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
