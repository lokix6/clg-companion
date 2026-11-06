import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Check, Save, Search, Users, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  attnKeys,
  facultyCatalogStudentsQuery,
  facultyCatalogSubjectsQuery,
  facultyMarksForDateQuery,
} from "@/features/attendance/sprint2Queries";

export const Route = createFileRoute("/faculty/attendance")({
  component: FacultyAttendancePage,
});

type Status = "Present" | "Absent";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function FacultyAttendancePage() {
  const qc = useQueryClient();
  const subjects = useQuery(facultyCatalogSubjectsQuery());

  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (!subjectId && subjects.data && subjects.data.length > 0) {
      setSubjectId(subjects.data[0].id);
    }
  }, [subjects.data, subjectId]);

  const students = useQuery(facultyCatalogStudentsQuery(subjectId));
  const existing = useQuery(facultyMarksForDateQuery(subjectId, date));

  // Initialize marks: existing overrides, default Present
  useEffect(() => {
    if (!students.data) return;
    const next: Record<string, Status> = {};
    for (const s of students.data) next[s.student_id] = existing.data?.[s.student_id] ?? "Present";
    setMarks(next);
  }, [students.data, existing.data]);

  const chosen = useMemo(
    () => subjects.data?.find((s) => s.id === subjectId),
    [subjects.data, subjectId],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.data ?? [];
    return (students.data ?? []).filter((s) =>
      [s.full_name, s.email, s.roll_number].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [students.data, search]);

  const presentCount = Object.values(marks).filter((v) => v === "Present").length;
  const absentCount = Object.values(marks).filter((v) => v === "Absent").length;
  const hasExisting = Object.keys(existing.data ?? {}).length > 0;

  const setStatus = (id: string, status: Status) =>
    setMarks((prev) => ({ ...prev, [id]: status }));

  const bulkSet = (status: Status) => {
    const next: Record<string, Status> = { ...marks };
    for (const s of filteredStudents) next[s.student_id] = status;
    setMarks(next);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Pick a subject");
      const payload = (students.data ?? []).map((s) => ({
        student_id: s.student_id,
        status: marks[s.student_id] ?? "Present",
      }));
      if (payload.length === 0) throw new Error("No students to save");
      const { data, error } = await supabase.rpc("faculty_save_catalog_attendance" as never, {
        _catalog_subject_id: subjectId,
        _date: date,
        _marks: payload,
      } as never);
      if (error) throw error;
      return data as { ok: boolean; saved: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: attnKeys.facultyMarks(subjectId, date) });
      qc.invalidateQueries({ queryKey: attnKeys.facultyDashboard() });
      qc.invalidateQueries({ queryKey: attnKeys.studentSummary() });
      qc.invalidateQueries({ queryKey: attnKeys.studentRecent(50) });
      qc.invalidateQueries({ queryKey: attnKeys.adminOverview() });
      toast.success(`Attendance saved (${res?.saved ?? 0} students)`);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Save failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark class attendance for your assigned subjects. Students see updates immediately."
      />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[1fr_180px_auto]">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            {(subjects.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.subject_name}
                {s.subject_code ? ` (${s.subject_code})` : ""}
                {s.semester ? ` · Sem ${s.semester}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !subjectId || (students.data?.length ?? 0) === 0}
          className="bg-gradient-primary shadow-elegant hover:opacity-95"
        >
          <Save className="mr-2 h-4 w-4" /> {save.isPending ? "Saving…" : "Save attendance"}
        </Button>
      </div>

      {(subjects.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No subjects assigned"
          description="Ask an administrator to assign you catalog subjects to start marking attendance."
        />
      ) : !subjectId ? (
        <EmptyState
          icon={CalendarCheck}
          title="Select a subject"
          description="Choose one of your assigned subjects to begin."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <InfoCard>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Subject</div>
              <div className="mt-1 truncate text-sm font-semibold">{chosen?.subject_name}</div>
              <div className="text-xs text-muted-foreground">
                {chosen?.department_name ?? "—"} · Sem {chosen?.semester ?? "—"}
              </div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Students</div>
              <div className="mt-1 text-2xl font-bold">{students.data?.length ?? 0}</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Present</div>
              <div className="mt-1 text-2xl font-bold text-success">{presentCount}</div>
            </InfoCard>
            <InfoCard>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Absent</div>
              <div className="mt-1 text-2xl font-bold text-destructive">{absentCount}</div>
            </InfoCard>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll no, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => bulkSet("Present")}>
              <Check className="mr-1 h-4 w-4" /> Mark all present
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkSet("Absent")}>
              <X className="mr-1 h-4 w-4" /> Mark all absent
            </Button>
            {hasExisting && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Editing existing session
              </Badge>
            )}
          </div>

          {students.isLoading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading students…
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students match"
              description={
                (students.data?.length ?? 0) === 0
                  ? "No students are enrolled in this subject's department & semester yet."
                  : "Try clearing your search."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {filteredStudents.map((s) => {
                  const st = marks[s.student_id] ?? "Present";
                  return (
                    <li
                      key={s.student_id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.full_name ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s.roll_number ? `${s.roll_number} · ` : ""}
                          {s.email}
                        </div>
                      </div>
                      <div className="flex overflow-hidden rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setStatus(s.student_id, "Present")}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            st === "Present" ? "bg-success/15 text-success" : "hover:bg-muted"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(s.student_id, "Absent")}
                          className={`border-l border-border px-3 py-1 text-xs font-medium transition-colors ${
                            st === "Absent" ? "bg-destructive/15 text-destructive" : "hover:bg-muted"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
