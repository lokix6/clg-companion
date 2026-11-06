import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Search,
  Upload,
  Award,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentSubmitDialog } from "@/features/assignments/StudentSubmitDialog";
import { studentAssignmentsQuery } from "@/features/assignments/queries";
import type { StudentAssignmentRow } from "@/features/assignments/types";

export const Route = createFileRoute("/_authenticated/dashboard/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — EduFlow" },
      { name: "description", content: "View, submit, and track student assignments in EduFlow." },
      { property: "og:title", content: "Assignments — EduFlow" },
      { property: "og:description", content: "View, submit, and track student assignments in EduFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentAssignmentsPage,
});

type StatusKey = "all" | "pending" | "submitted" | "graded" | "overdue";

function classify(a: StudentAssignmentRow): StatusKey {
  const due = new Date(a.due_date).getTime();
  const now = Date.now();
  if (a.review_status && a.review_status !== "Pending") return "graded";
  if (a.submission_id) return "submitted";
  if (due < now) return "overdue";
  return "pending";
}

function StudentAssignmentsPage() {
  const q = useQuery(studentAssignmentsQuery());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusKey>("all");
  const [selected, setSelected] = useState<StudentAssignmentRow | null>(null);
  const [open, setOpen] = useState(false);

  const rows = q.data ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (filter !== "all" && classify(a) !== filter) return false;
      if (!s) return true;
      return [a.title, a.subject_name, a.subject_code, a.faculty_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [rows, search, filter]);

  const stats = useMemo(() => {
    let pending = 0, submitted = 0, graded = 0, overdue = 0;
    for (const a of rows) {
      const c = classify(a);
      if (c === "pending") pending++;
      else if (c === "submitted") submitted++;
      else if (c === "graded") graded++;
      else if (c === "overdue") overdue++;
    }
    return { pending, submitted, graded, overdue };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="View, submit and track assignments from your faculty."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Clock} label="Pending" value={stats.pending} tone="default" />
        <StatCard icon={Upload} label="Submitted" value={stats.submitted} tone="primary" />
        <StatCard icon={Award} label="Graded" value={stats.graded} tone="success" />
        <StatCard icon={ClipboardList} label="Overdue" value={stats.overdue} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as StatusKey)}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {q.isLoading ? (
        <LoadingState label="Loading assignments…" />
      ) : q.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            Couldn’t load your assignments.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(q.error as Error)?.message || "Unknown error"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={rows.length === 0 ? "No assignments yet" : "No assignments match your filter"}
          description={
            rows.length === 0
              ? "Assignments from your faculty will appear here as they're published."
              : "Try clearing filters or search."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const c = classify(a);
            const badge =
              c === "graded"
                ? { label: a.review_status ?? "Graded", variant: "default" as const }
                : c === "submitted"
                ? { label: "Submitted", variant: "secondary" as const }
                : c === "overdue"
                ? { label: "Overdue", variant: "destructive" as const }
                : { label: "Pending", variant: "outline" as const };
            return (
              <article
                key={a.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-shadow hover:shadow-elegant"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {a.subject_code || a.subject_name || "—"}
                    </div>
                    <div className="mt-1 truncate text-base font-semibold" title={a.title}>
                      {a.title}
                    </div>
                    {a.faculty_name && (
                      <div className="text-xs text-muted-foreground">by {a.faculty_name}</div>
                    )}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                {a.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Due {new Date(a.due_date).toLocaleDateString()}</span>
                  </div>
                  {c === "graded" && a.marks != null ? (
                    <span className="font-semibold text-foreground">
                      {a.marks}
                      {a.max_marks != null ? ` / ${a.max_marks}` : ""}
                    </span>
                  ) : a.max_marks != null ? (
                    <span>{a.max_marks} marks</span>
                  ) : null}
                </div>
                <div className="mt-3">
                   <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     className="w-full"
                     onClick={() => {
                       setSelected(a);
                       setOpen(true);
                     }}
                   >
                    {c === "graded" ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> View result
                      </>
                    ) : a.submission_id ? (
                      "View / replace"
                    ) : (
                      <>
                        <Upload className="mr-1 h-3.5 w-3.5" /> Submit
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <StudentSubmitDialog open={open} onOpenChange={setOpen} assignment={selected} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "default" | "primary" | "success" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
