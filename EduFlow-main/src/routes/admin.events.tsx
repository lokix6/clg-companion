import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  Users,
} from "lucide-react";
import { ManageEditorsDialog } from "@/features/communication/events/ManageEditorsDialog";
import { myEditableEventIdsQuery } from "@/features/communication/events/editorQueries";
import { useIsAdmin } from "@/features/admin/useIsAdmin";
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
  adminEventsQueryOptions,
  adminKeys,
} from "@/features/admin/queries";
import { communicationKeys } from "@/features/communication/queries";
import type { Event } from "@/features/communication/types";
import { formatEventTime, isPastEvent } from "@/features/communication/types";
import { AdminEventDialog } from "@/features/admin/events/AdminEventDialog";
import { logAdminActivity } from "@/features/admin/logActivity";

export const Route = createFileRoute("/admin/events")({
  component: AdminEventsPage,
});

export function AdminEventsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const list = useQuery(adminEventsQueryOptions());
  const isAdmin = useIsAdmin().data === true;
  const editable = useQuery(myEditableEventIdsQuery(uid));
  const editableSet = useMemo(() => new Set(editable.data ?? []), [editable.data]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled" | "all">("upcoming");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [toDelete, setToDelete] = useState<Event | null>(null);
  const [managing, setManaging] = useState<Event | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list.data ?? []).filter((e) => {
      if (filter === "upcoming" && (isPastEvent(e) || e.is_cancelled)) return false;
      if (filter === "past" && !isPastEvent(e)) return false;
      if (filter === "cancelled" && !e.is_cancelled) return false;
      if (!term) return true;
      return [e.title, e.venue, e.organizer, e.category].some((v) =>
        v?.toLowerCase().includes(term),
      );
    });
  }, [list.data, q, filter]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.events() });
    qc.invalidateQueries({ queryKey: communicationKeys.events() });
    qc.invalidateQueries({ queryKey: adminKeys.activity() });
    qc.invalidateQueries({ queryKey: adminKeys.stats() });
  };

  const toggleFeature = useMutation({
    mutationFn: async (e: Event) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("events")
        .update({ is_featured: !e.is_featured })
        .eq("id", e.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: !e.is_featured ? "Featured event" : "Unfeatured event",
        targetType: "event",
        targetId: e.id,
        metadata: { label: e.title },
      });
    },
    onSuccess: invalidate,
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const toggleCancel = useMutation({
    mutationFn: async (e: Event) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("events")
        .update({ is_cancelled: !e.is_cancelled })
        .eq("id", e.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: !e.is_cancelled ? "Cancelled event" : "Reinstated event",
        targetType: "event",
        targetId: e.id,
        metadata: { label: e.title },
      });
    },
    onSuccess: invalidate,
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const del = useMutation({
    mutationFn: async (e: Event) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("events").delete().eq("id", e.id);
      if (error) throw error;
      await logAdminActivity({
        actorId: user.id,
        action: "Deleted event",
        targetType: "event",
        targetId: e.id,
        metadata: { label: e.title },
      });
    },
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Event deleted");
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Publish campus events with featuring and cancellation controls."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-2 h-4 w-4" /> New event
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
              placeholder="Search events…"
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events" description="Create your first campus event." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const isOwner = !!uid && e.created_by === uid;
            const isEditor = editableSet.has(e.id);
            const canEdit = isAdmin || isOwner || isEditor;
            const canOwnerOps = isAdmin || isOwner;
            return (
              <li key={e.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.is_featured && <Badge variant="default">Featured</Badge>}
                      {e.is_cancelled && <Badge variant="destructive">Cancelled</Badge>}
                      <Badge variant="outline">{e.category}</Badge>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{e.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(e.event_date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {formatEventTime(e)}
                      {" · "}
                      {e.venue}
                    </p>
                    {e.organizer && (
                      <p className="mt-0.5 text-xs text-muted-foreground">By {e.organizer}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canOwnerOps && (
                      <Button size="sm" variant="outline" onClick={() => toggleFeature.mutate(e)}>
                        {e.is_featured ? <StarOff className="mr-1 h-3.5 w-3.5" /> : <Star className="mr-1 h-3.5 w-3.5" />}
                        {e.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                    )}
                    {canOwnerOps && (
                      <Button size="sm" variant="outline" onClick={() => toggleCancel.mutate(e)}>
                        {e.is_cancelled ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Ban className="mr-1 h-3.5 w-3.5" />}
                        {e.is_cancelled ? "Reinstate" : "Cancel"}
                      </Button>
                    )}
                    {canOwnerOps && (
                      <Button size="sm" variant="outline" onClick={() => setManaging(e)}>
                        <Users className="mr-1 h-3.5 w-3.5" /> Editors
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {canOwnerOps && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {managing && (
        <ManageEditorsDialog
          open={!!managing}
          onOpenChange={(o) => !o && setManaging(null)}
          eventId={managing.id}
          eventTitle={managing.title}
        />
      )}

      <AdminEventDialog open={open} onOpenChange={setOpen} event={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete event?"
        description={toDelete ? `Delete "${toDelete.title}" permanently?` : ""}
        loading={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
        }}
      />
    </div>
  );
}
