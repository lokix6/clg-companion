import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  editorsForEventQuery,
  eventEditorKeys,
} from "./editorQueries";

type UserRow = { id: string; full_name: string | null; email: string | null };

export function ManageEditorsDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventId: string;
  eventTitle: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");

  const editors = useQuery(editorsForEventQuery(eventId));
  const currentIds = useMemo(
    () => new Set((editors.data ?? []).map((e) => e.user_id)),
    [editors.data],
  );

  const search = useQuery({
    queryKey: ["editor-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<UserRow[]> => {
      const t = `%${term.trim()}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.${t},email.ilike.${t}`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const grant = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("event_editors")
        .insert({ event_id: eventId, user_id: userId, granted_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventEditorKeys.editorsForEvent(eventId) });
      toast.success("Editor access granted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_editors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventEditorKeys.editorsForEvent(eventId) });
      toast.success("Editor access revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage editors</DialogTitle>
          <DialogDescription>
            Grant colleagues or students permission to edit "{eventTitle}". Editors can update
            details but cannot delete the event or manage other editors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>

          {term.trim().length >= 2 && (
            <div className="rounded-lg border bg-background">
              {search.isLoading ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                </div>
              ) : (search.data ?? []).length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No matches.</div>
              ) : (
                <ul className="max-h-56 overflow-y-auto divide-y">
                  {(search.data ?? []).map((u) => {
                    const already = currentIds.has(u.id);
                    return (
                      <li key={u.id} className="flex items-center justify-between p-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.full_name ?? u.email ?? u.id}</div>
                          {u.email && (
                            <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={already ? "outline" : "default"}
                          disabled={already || grant.isPending}
                          onClick={() => grant.mutate(u.id)}
                        >
                          {already ? (
                            "Editor"
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-3.5 w-3.5" /> Grant
                            </>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Current editors ({editors.data?.length ?? 0})
            </h4>
            {editors.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (editors.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No editors granted yet.</div>
            ) : (
              <ul className="space-y-2">
                {(editors.data ?? []).map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {e.full_name ?? e.email ?? e.user_id}
                      </div>
                      {e.email && (
                        <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => revoke.mutate(e.id)}
                      disabled={revoke.isPending}
                      aria-label="Revoke"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
