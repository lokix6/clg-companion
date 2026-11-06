import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { facultyMySubjectsQueryOptions } from "@/features/faculty/queries";

export const Route = createFileRoute("/faculty/subjects")({
  component: FacultyMySubjectsPage,
});

function FacultyMySubjectsPage() {
  const list = useQuery(facultyMySubjectsQueryOptions());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((s) =>
      !t
        ? true
        : [s.subject_name, s.subject_code, s.department]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(t)),
    );
  }, [list.data, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subjects"
        description="Subjects assigned to you by the administrator."
      />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subjects…"
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
          icon={BookOpen}
          title="No subjects assigned"
          description="Ask an administrator to assign subjects to your faculty account."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.subject_key}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {s.subject_code ?? "—"}
                  </div>
                  <h3 className="mt-1 truncate text-base font-semibold" title={s.subject_name}>
                    {s.subject_name}
                  </h3>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {s.department && <Badge variant="outline">{s.department}</Badge>}
                {s.semester != null && (
                  <Badge variant="secondary">Sem {s.semester}</Badge>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {s.student_count} student{s.student_count === 1 ? "" : "s"}
                  </span>
                </div>
                <Link
                  to="/faculty/attendance"
                  className="font-medium text-primary hover:underline"
                >
                  Mark attendance →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
