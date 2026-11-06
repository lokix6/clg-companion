import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { communicationKeys, eventsQuery } from "@/features/communication/queries";
import { EventCard } from "@/features/communication/events/EventCard";
import { EventDialog } from "@/features/communication/events/EventDialog";
import { ManageEditorsDialog } from "@/features/communication/events/ManageEditorsDialog";
import { myEditableEventIdsQuery } from "@/features/communication/events/editorQueries";
import { useIsAdmin } from "@/features/admin/useIsAdmin";
import { useIsFaculty } from "@/features/roles/useUserRole";
import {
  EVENT_CATEGORIES,
  eventDateTime,
  isPastEvent,
  isTodayEvent,
  type Event,
} from "@/features/communication/types";

export const Route = createFileRoute("/_authenticated/dashboard/events")({
  head: () => ({
    meta: [
      { title: "Events — EduFlow" },
      { name: "description", content: "Campus events calendar." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EventsPage,
});

type View = "upcoming" | "today" | "past" | "all";

function EventsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(eventsQuery(uid));
  const isAdmin = useIsAdmin().data === true;
  const isFaculty = useIsFaculty().data === true;
  const editable = useQuery(myEditableEventIdsQuery(uid));
  const editableSet = useMemo(() => new Set(editable.data ?? []), [editable.data]);
  const items = data ?? [];

  const [view, setView] = useState<View>("upcoming");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);
  const [managing, setManaging] = useState<Event | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const scoped = items.filter((e) => {
      if (view === "upcoming" && isPastEvent(e)) return false;
      if (view === "past" && !isPastEvent(e)) return false;
      if (view === "today" && !isTodayEvent(e)) return false;
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    });
    return scoped.sort((a, b) => {
      const diff = eventDateTime(a).getTime() - eventDateTime(b).getTime();
      return view === "past" ? -diff : diff;
    });
  }, [items, view, search, category]);

  const canCreate = isAdmin || isFaculty;

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communicationKeys.events() });
      toast.success("Event deleted");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as { message?: string }).message || "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Discover workshops, seminars, and campus activities."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-gradient-primary shadow-elegant hover:opacity-95"
            >
              <Plus className="mr-1.5 h-4 w-4" /> New event
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EVENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading events..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={items.length === 0 ? "No events yet" : "No matches"}
          description={
            items.length === 0
              ? canCreate
                ? "Create the first event to get started."
                : "Check back soon for upcoming events."
              : "Try adjusting your filters."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => {
            const isOwner = !!uid && e.created_by === uid;
            const isEditor = editableSet.has(e.id);
            const canEdit = isAdmin || isOwner || isEditor;
            const canDelete = isAdmin || isOwner;
            const canManageEditors = isAdmin || isOwner;
            return (
              <EventCard
                key={e.id}
                event={e}
                canEdit={canEdit}
                canDelete={canDelete}
                canManageEditors={canManageEditors}
                onEdit={
                  canEdit
                    ? () => {
                        setEditing(e);
                        setDialogOpen(true);
                      }
                    : undefined
                }
                onDelete={canDelete ? () => setDeleting(e) : undefined}
                onManageEditors={canManageEditors ? () => setManaging(e) : undefined}
              />
            );
          })}
        </div>
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} />
      {managing && (
        <ManageEditorsDialog
          open={!!managing}
          onOpenChange={(o) => !o && setManaging(null)}
          eventId={managing.id}
          eventTitle={managing.title}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete event?"
        description={deleting ? `"${deleting.title}" will be permanently removed.` : ""}
        onConfirm={() => { if (deleting) remove.mutate(deleting.id); }}
        loading={remove.isPending}
      />
    </div>
  );
}
