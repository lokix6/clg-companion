import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  FileCheck,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
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
import { AssignmentDialog } from "@/features/assignments/AssignmentDialog";
import { SubmissionsDialog } from "@/features/assignments/SubmissionsDialog";
import {
  assignmentKeys,
  facultyAssignmentsQuery,
  facultyCatalogSubjectsQuery,
} from "@/features/assignments/queries";
import type { FacultyAssignmentRow } from "@/features/assignments/types";

export const Route = createFileRoute("/faculty/assignments")({
  head: () => ({
    meta: [
      { title: "Faculty Assignments — EduFlow" },
      { name: "description", content: "Create, publish, and grade faculty assignments in EduFlow." },
      { property: "og:title", content: "Faculty Assignments — EduFlow" },
      { property: "og:description", content: "Create, publish, and grade faculty assignments in EduFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FacultyAssignmentsPage,
  errorComponent: AssignmentsRouteError,
  notFoundComponent: () => (
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Assignments page not found.
    </div>
  ),
});

function AssignmentsRouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <PageHeader title="Assignments" description="Something went wrong loading this page." />
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">Assignments failed to load.</p>
        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.invalidate()}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}


function FacultyAssignmentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [editing, setEditing] = useState<FacultyAssignmentRow | null>(null);
  const [reviewing, setReviewing] = useState<FacultyAssignmentRow | null>(null);
  const [toDelete, setToDelete] = useState<FacultyAssignmentRow | null>(null);

  const subjectsQ = useQuery(facultyCatalogSubjectsQuery());
  const list = useQuery(facultyAssignmentsQuery());

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((a) => {
      if (statusF !== "all" && a.publish_status !== statusF) return false;
      if (!t) return true;
      return [a.title, a.description, a.subject_code, a.subject_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(t));
    });
  }, [list.data, q, statusF]);

  const del = useMutation({
    mutationFn: async (a: FacultyAssignmentRow) => {
      const { data, error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", a.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Assignment could not be deleted");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assignmentKeys.facultyList() });
      qc.invalidateQueries({ queryKey: assignmentKeys.facultyDashboard() });
      toast.success("Assignment deleted");
      setToDelete(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Delete failed"),
  });

  const noSubjects = (subjectsQ.data ?? []).length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Create and grade assignments for the subjects you teach."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={noSubjects}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-2 h-4 w-4" /> New assignment
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search assignments…"
            className="pl-9"
          />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {subjectsQ.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn’t load your assigned subjects.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(subjectsQ.error as Error)?.message || "Unknown error"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => subjectsQ.refetch()}>
            Try again
          </Button>
        </div>
      ) : list.isLoading || subjectsQ.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : list.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn’t load assignments.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(list.error as Error)?.message || "Unknown error"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => list.refetch()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description={
            noSubjects
              ? "You have no subjects assigned yet. Ask an administrator to assign one."
              : "Create your first assignment for students."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {a.subject_code || a.subject_name || "—"}
                  </div>
                  <div className="mt-1 truncate text-base font-semibold" title={a.title}>
                    {a.title}
                  </div>
                </div>
                <Badge
                  variant={
                    a.publish_status === "Published"
                      ? "default"
                      : a.publish_status === "Closed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {a.publish_status}
                </Badge>
              </div>
              {a.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>Due {new Date(a.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{a.submission_count}/{a.total_students} submitted</span>
                </div>
                {a.max_marks != null && <span>Max {a.max_marks}</span>}
                {a.pending_review > 0 && (
                  <span className="text-amber-600">{a.pending_review} pending</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-primary"
                  onClick={() => {
                    setReviewing(a);
                    setSubsOpen(true);
                  }}
                >
                  <FileCheck className="mr-1 h-3.5 w-3.5" />
                  Review ({a.submission_count})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(a);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToDelete(a)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={editing}
        subjects={subjectsQ.data ?? []}
      />
      <SubmissionsDialog
        open={subsOpen}
        onOpenChange={setSubsOpen}
        assignment={reviewing}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete assignment?"
        description={
          toDelete
            ? `"${toDelete.title}" and all submissions will be removed.`
            : ""
        }
        loading={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
        }}
      />
    </div>
  );
}
