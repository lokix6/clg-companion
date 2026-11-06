import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, UserCog, UserX, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  adminKeys,
  adminStudentsQueryOptions,
  type AdminStudent,
} from "@/features/admin/queries";
import { logAdminActivity } from "@/features/admin/logActivity";
import { StudentEditDialog } from "@/features/admin/students/StudentEditDialog";

export const Route = createFileRoute("/admin/students")({
  component: StudentsPage,
});

function initialsOf(name: string | null, email: string | null): string {
  const src = name || email || "S";
  return src
    .split(/\s+|@/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useQuery(adminStudentsQueryOptions());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "deleted">("all");
  const [role, setRole] = useState<"all" | "student" | "admin">("all");
  const [dept, setDept] = useState<string>("all");
  const [editing, setEditing] = useState<AdminStudent | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const items = list.data ?? [];
    const term = q.trim().toLowerCase();
    return items.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (role !== "all" && s.role !== role) return false;
      if (dept !== "all" && (s.department ?? "") !== dept) return false;
      if (!term) return true;
      return [s.full_name, s.email, s.college_name, s.branch, s.department]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [list.data, q, status, role, dept]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    (list.data ?? []).forEach((s) => s.department && set.add(s.department));
    return Array.from(set).sort();
  }, [list.data]);

  const toggleStatus = useMutation({
    mutationFn: async ({ s, next }: { s: AdminStudent; next: "active" | "inactive" }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ status: next, role_updated_by: user.id })
        .eq("id", s.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: next === "active" ? "Reactivated student" : "Deactivated student",
        targetType: "profile",
        targetId: s.id,
        metadata: { label: s.full_name || s.email || s.id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.students() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      toast.success("Status updated");
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Update failed");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${list.data?.length ?? 0} registered users`}
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, college…"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading students…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match"
          description="Try clearing filters or adjusting the search."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">College / Dept</th>
                  <th className="px-4 py-3 font-medium">Sem</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={s.avatar_url ?? undefined} alt={s.full_name ?? ""} />
                          <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                            {initialsOf(s.full_name, s.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {s.full_name || "Unnamed"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate">{s.college_name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.department || s.branch || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.semester ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.role === "admin" ? "default" : "secondary"}>
                        {s.role ?? "student"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(s);
                            setOpen(true);
                          }}
                        >
                          <UserCog className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        {s.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStatus.mutate({ s, next: "inactive" })}
                          >
                            <UserX className="mr-1 h-3.5 w-3.5" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStatus.mutate({ s, next: "active" })}
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" /> Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StudentEditDialog open={open} onOpenChange={setOpen} student={editing} />
    </div>
  );
}

function StatusPill({ status }: { status: AdminStudent["status"] }) {
  const map = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    inactive: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    deleted: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}
