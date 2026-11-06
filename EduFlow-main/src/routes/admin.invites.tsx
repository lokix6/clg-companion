import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InviteDialog } from "@/features/admin/invites/InviteDialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logAdminActivity } from "@/features/admin/logActivity";

export const Route = createFileRoute("/admin/invites")({
  component: AdminInvitesPage,
});

type InviteRow = {
  id: string;
  code: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
};

function statusOf(row: InviteRow): { label: string; className: string } {
  if (row.redeemed_at)
    return { label: "Redeemed", className: "bg-emerald-500/10 text-emerald-600" };
  if (new Date(row.expires_at) < new Date())
    return { label: "Expired", className: "bg-muted text-muted-foreground" };
  return { label: "Pending", className: "bg-amber-500/10 text-amber-600" };
}

function AdminInvitesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const list = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from("faculty_invites")
        .select("id, code, email, full_name, department_id, expires_at, redeemed_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const revoke = useMutation({
    mutationFn: async (row: InviteRow) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("faculty_invites").delete().eq("id", row.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Revoked faculty invite",
        targetType: "invite",
        targetId: row.id,
        metadata: { email: row.email, code: row.code },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
      toast.success("Invite revoked");
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Failed"),
  });

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success("Link copied");
  };

  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Invites"
        description="Generate single-use invite links to onboard Faculty. Each link is bound to one email address."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
            <Plus className="mr-2 h-4 w-4" /> New invite
          </Button>
        }
      />

      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No invites yet"
          description="Click 'New invite' to onboard your first Faculty member."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invitee</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const s = statusOf(r);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {!r.redeemed_at && (
                            <Button size="sm" variant="ghost" onClick={() => copy(r.code)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revoke.mutate(r)}
                            disabled={revoke.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
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

      <InviteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
