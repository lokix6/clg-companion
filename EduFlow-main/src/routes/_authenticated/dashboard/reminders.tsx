import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentAssignmentsQuery } from "@/features/assignments/queries";
import { reminderKeys, remindersQuery } from "@/features/reminders/queries";
import { ReminderCard } from "@/features/reminders/ReminderCard";
import { ReminderDialog } from "@/features/reminders/ReminderDialog";
import { reminderStatus, type AssignmentReminder } from "@/features/reminders/types";

export const Route = createFileRoute("/_authenticated/dashboard/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const remindersQ = useQuery(remindersQuery(uid));
  const assignmentsQ = useQuery(studentAssignmentsQuery());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentReminder | null>(null);
  const [deleting, setDeleting] = useState<AssignmentReminder | null>(null);

  const assignments = assignmentsQ.data ?? [];
  const asgById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  const reminders = remindersQ.data ?? [];
  const buckets = useMemo(() => {
    const upcoming: AssignmentReminder[] = [];
    const dueOrOverdue: AssignmentReminder[] = [];
    const done: AssignmentReminder[] = [];
    for (const r of reminders) {
      const a = asgById.get(r.assignment_id);
       const st = a
         ? reminderStatus(a.due_date, a.review_status && a.review_status !== "Pending" ? "Completed" : "Pending")
         : "Upcoming";
      if (r.is_dismissed || st === "Completed") done.push(r);
      else if (st === "Overdue" || st === "Due Today") dueOrOverdue.push(r);
      else upcoming.push(r);
    }
    return { upcoming, dueOrOverdue, done };
  }, [reminders, asgById]);

  const invalidate = () => {
    if (uid) qc.invalidateQueries({ queryKey: reminderKeys.all(uid) });
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignment_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Reminder deleted");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Delete failed"),
  });

  const dismissMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assignment_reminders")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Dismissed");
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Failed"),
  });

  const list = (arr: AssignmentReminder[]) =>
    arr.length === 0 ? (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing here.
      </p>
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {arr.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            assignment={asgById.get(r.assignment_id)}
            onEdit={() => {
              setEditing(r);
              setDialogOpen(true);
            }}
            onDelete={() => setDeleting(r)}
            onDismiss={() => dismissMut.mutate(r.id)}
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignment Reminders"
        description="Get notified 1, 3, or 7 days before an assignment is due."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={assignments.length === 0}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New reminder
          </Button>
        }
      />

      {remindersQ.isLoading || assignmentsQ.isLoading ? (
        <LoadingState label="Loading reminders..." />
      ) : remindersQ.isError || assignmentsQ.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn’t load assignment reminders.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {((remindersQ.error || assignmentsQ.error) as Error)?.message || "Unknown error"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void remindersQ.refetch();
              void assignmentsQ.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description={
            assignments.length === 0
              ? "Add an assignment first, then create a reminder for it."
              : "Create a reminder to get a nudge before your assignment is due."
          }
        />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
            <TabsTrigger value="due">Due / Overdue ({buckets.dueOrOverdue.length})</TabsTrigger>
            <TabsTrigger value="done">Completed ({buckets.done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">{list(buckets.upcoming)}</TabsContent>
          <TabsContent value="due" className="mt-4">{list(buckets.dueOrOverdue)}</TabsContent>
          <TabsContent value="done" className="mt-4">{list(buckets.done)}</TabsContent>
        </Tabs>
      )}

      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignments={assignments}
        reminder={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete reminder?"
        description="This reminder will be removed."
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting.id);
        }}
      />
    </div>
  );
}
