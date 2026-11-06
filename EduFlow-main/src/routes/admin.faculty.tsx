import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { GraduationCap, Mail, Search, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logAdminActivity } from "@/features/admin/logActivity";

export const Route = createFileRoute("/admin/faculty")({
  component: AdminFacultyPage,
});

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  college_name: string | null;
  branch: string | null;
  isFaculty: boolean;
  isAdmin: boolean;
};

function AdminFacultyPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin-faculty-list"],
    queryFn: async (): Promise<Row[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, college_name, branch").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const facultyIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === "faculty").map((r) => r.user_id),
      );
      const adminIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      return (profilesRes.data ?? [])
        .map((p) => ({
          ...p,
          isFaculty: facultyIds.has(p.id),
          isAdmin: adminIds.has(p.id),
        }))
        // Only surface Faculty (and Admins) — students are managed under /admin/students
        .filter((p) => p.isFaculty || p.isAdmin);
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = list.data ?? [];
    return rows.filter((r) =>
      !t
        ? true
        : [r.full_name, r.email, r.branch, r.college_name]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(t)),
    );
  }, [list.data, q]);

  const revokeFaculty = useMutation({
    mutationFn: async (row: Row) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("admin_revoke_role", {
        _user_id: row.id,
        _role: "faculty",
      });
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Revoked faculty role",
        targetType: "user",
        targetId: row.id,
        metadata: { name: row.full_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-faculty-list"] });
      toast.success("Faculty role revoked");
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Failed"),
  });

  const promoteAdmin = useMutation({
    mutationFn: async (row: Row) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("admin_grant_role", {
        _user_id: row.id,
        _role: "admin",
      });
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Promoted to Admin",
        targetType: "user",
        targetId: row.id,
        metadata: { name: row.full_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-faculty-list"] });
      toast.success("Promoted to Admin");
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Failed"),
  });

  const revokeAdmin = useMutation({
    mutationFn: async (row: Row) => {
      if (!user) throw new Error("Not signed in");
      if (row.id === user.id) throw new Error("You cannot revoke your own Admin role.");
      const { error } = await supabase.rpc("admin_revoke_role", {
        _user_id: row.id,
        _role: "admin",
      });
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Revoked Admin role",
        targetType: "user",
        targetId: row.id,
        metadata: { name: row.full_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-faculty-list"] });
      toast.success("Admin role revoked");
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Failed"),
  });

  const facultyCount = (list.data ?? []).filter((r) => r.isFaculty).length;
  const adminCount = (list.data ?? []).filter((r) => r.isAdmin).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Administrators"
        description={`${facultyCount} Faculty · ${adminCount} Admin${adminCount === 1 ? "" : "s"}. Faculty are onboarded via invite; Admins are promoted from Faculty.`}
        actions={
          <Button asChild className="bg-gradient-primary">
            <Link to="/admin/invites">
              <Mail className="mr-2 h-4 w-4" /> Invite Faculty
            </Link>
          </Button>
        }
      />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Faculty or Admins…" className="pl-9" />
        </div>
      </div>
      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Faculty yet"
          description="Send an invite to onboard your first Faculty member."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const initials = (r.full_name ?? r.email ?? "?")
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isSelf = r.id === user?.id;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{r.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.branch ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-600">
                              <Shield className="h-3 w-3" /> Admin
                            </span>
                          )}
                          {r.isFaculty && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              <ShieldCheck className="h-3 w-3" /> Faculty
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {r.isFaculty && !r.isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => promoteAdmin.mutate(r)}
                              disabled={promoteAdmin.isPending}
                            >
                              <Shield className="mr-1 h-3.5 w-3.5" /> Promote to Admin
                            </Button>
                          )}
                          {r.isAdmin && !isSelf && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeAdmin.mutate(r)}
                              disabled={revokeAdmin.isPending}
                            >
                              <ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke Admin
                            </Button>
                          )}
                          {r.isFaculty && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => revokeFaculty.mutate(r)}
                              disabled={revokeFaculty.isPending}
                            >
                              <ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke Faculty
                            </Button>
                          )}
                        </div>
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
