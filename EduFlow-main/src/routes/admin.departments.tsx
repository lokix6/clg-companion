import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  adminDepartmentsQueryOptions,
  adminKeys,
  type AdminDepartment,
} from "@/features/admin/queries";
import { DepartmentDialog } from "@/features/admin/departments/DepartmentDialog";
import { logAdminActivity } from "@/features/admin/logActivity";

export const Route = createFileRoute("/admin/departments")({
  component: AdminDepartmentsPage,
});

function AdminDepartmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useQuery(adminDepartmentsQueryOptions());
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDepartment | null>(null);
  const [toDelete, setToDelete] = useState<AdminDepartment | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((d) =>
      !t
        ? true
        : [d.name, d.code, d.description]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(t)),
    );
  }, [list.data, q]);

  const del = useMutation({
    mutationFn: async (d: AdminDepartment) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("departments").delete().eq("id", d.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Deleted department",
        targetType: "department",
        targetId: d.id,
        metadata: { label: d.name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.departments() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      toast.success("Department deleted");
      setToDelete(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message || "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Create, edit and archive academic departments."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-2 h-4 w-4" /> New department
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments…"
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
          icon={Building2}
          title="No departments yet"
          description="Create your first department to seed the academic catalog."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-primary min-w-0">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {d.name}
                    </div>
                    {d.code && (
                      <div className="text-xs font-mono text-muted-foreground">{d.code}</div>
                    )}
                  </div>
                </div>
                <Badge variant={d.status === "active" ? "default" : "secondary"}>
                  {d.status}
                </Badge>
              </div>

              {d.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {d.description}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
                <div>
                  <dt className="text-muted-foreground">Subjects</dt>
                  <dd className="text-lg font-bold tabular-nums">{d.subject_count}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Faculty</dt>
                  <dd className="text-lg font-bold tabular-nums">{d.faculty_count}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Students</dt>
                  <dd className="text-lg font-bold tabular-nums">{d.student_count}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(d);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setToDelete(d)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editing}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete department?"
        description={
          toDelete
            ? `This permanently removes "${toDelete.name}". Subjects previously linked to it will become unassigned.`
            : ""
        }
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={() => { if (toDelete) del.mutate(toDelete); }}
      />
    </div>
  );
}
