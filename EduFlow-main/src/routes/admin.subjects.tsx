import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
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
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  adminDepartmentsQueryOptions,
  adminFacultyOptionsQueryOptions,
  adminKeys,
  adminSubjectsQueryOptions,
  type AdminSubject,
} from "@/features/admin/queries";
import { AdminSubjectDialog } from "@/features/admin/subjects/AdminSubjectDialog";
import { logAdminActivity } from "@/features/admin/logActivity";

export const Route = createFileRoute("/admin/subjects")({
  component: AdminSubjectsPage,
});

const UNASSIGN = "__unassign__";

function AdminSubjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useQuery(adminSubjectsQueryOptions());
  const departments = useQuery(adminDepartmentsQueryOptions());
  const faculty = useQuery(adminFacultyOptionsQueryOptions());
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [toDelete, setToDelete] = useState<AdminSubject | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list.data ?? []).filter((s) => {
      if (dept !== "all" && (s.department_id ?? "") !== dept) return false;
      if (!term) return true;
      return [s.subject_name, s.subject_code, s.faculty_name, s.department_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [list.data, q, dept]);

  const del = useMutation({
    mutationFn: async (s: AdminSubject) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("subjects").delete().eq("id", s.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Deleted subject",
        targetType: "subject",
        targetId: s.id,
        metadata: { label: s.subject_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.subjects() });
      qc.invalidateQueries({ queryKey: adminKeys.departments() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      qc.invalidateQueries({ queryKey: ["faculty"] });
      toast.success("Subject deleted");
      setToDelete(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message || "Delete failed"),
  });

  const assign = useMutation({
    mutationFn: async ({ subject, facultyId }: { subject: AdminSubject; facultyId: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const row = (faculty.data ?? []).find((f) => f.id === facultyId);
      const { error } = await supabase
        .from("subjects")
        .update({
          faculty_id: facultyId,
          faculty_name: row?.full_name ?? row?.email ?? null,
          faculty_email: row?.email ?? null,
        })
        .eq("id", subject.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: facultyId ? "Assigned faculty to subject" : "Unassigned faculty",
        targetType: "subject",
        targetId: subject.id,
        metadata: { label: subject.subject_name, faculty_id: facultyId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.subjects() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: ["faculty"] });
      toast.success("Faculty assignment updated");
    },
    onError: (e: unknown) => toast.error((e as Error)?.message || "Assignment failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description={`${list.data?.length ?? 0} subjects in the academic catalog`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-2 h-4 w-4" /> New subject
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subjects, code, faculty…"
              className="pl-9"
            />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Create your first subject to seed the platform catalog."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Sem</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium min-w-[220px]">Faculty</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.subject_name}</div>
                      {s.subject_code && (
                        <div className="text-xs font-mono text-muted-foreground">{s.subject_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.department_name ?? "—"}</td>
                    <td className="px-4 py-3">{s.semester ?? "—"}</td>
                    <td className="px-4 py-3">{s.credits ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select
                          value={s.faculty_id ?? UNASSIGN}
                          onValueChange={(v) =>
                            assign.mutate({ subject: s, facultyId: v === UNASSIGN ? null : v })
                          }
                        >
                          <SelectTrigger className="h-8 w-[190px]">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGN}>Unassigned</SelectItem>
                            {(faculty.data ?? []).map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.full_name || f.email || "Faculty"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setToDelete(s)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminSubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editing}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete subject?"
        description={toDelete ? `This will permanently remove "${toDelete.subject_name}".` : ""}
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
        }}
      />
    </div>
  );
}
