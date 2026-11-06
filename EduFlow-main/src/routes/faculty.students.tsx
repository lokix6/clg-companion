import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/faculty/students")({
  component: FacultyStudentsPage,
});

type Row = {
  student_id: string;
  roll_number: string | null;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  department_name: string | null;
  section: string | null;
  semester: number | null;
  attendance_percentage: number | null;
  submissions_count: number | null;
};

function FacultyStudentsPage() {
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["faculty", "students-overview"],
    staleTime: 20_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("faculty_students_overview" as never);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((s) =>
      !t
        ? true
        : [s.full_name, s.email, s.roll_number, s.department_name, s.section]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(t)),
    );
  }, [list.data, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${list.data?.length ?? 0} students enrolled in your subjects`}
      />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, roll no, email…"
            className="pl-9"
          />
        </div>
      </div>
      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={
            (list.data?.length ?? 0) === 0
              ? "You have no subjects assigned yet, or no active students match your department/semester."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium text-right">Attendance</th>
                  <th className="px-4 py-3 font-medium text-right">Submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  const initials = (s.full_name ?? s.email ?? "?")
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <tr key={s.student_id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{s.roll_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{s.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{s.department_name ?? "—"}</td>
                      <td className="px-4 py-3">{s.section ?? "—"}</td>
                      <td className="px-4 py-3">{s.semester ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.submissions_count ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
