import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassDialog } from "@/features/academic/timetable/ClassDialog";
import { TimetableCard } from "@/features/academic/timetable/TimetableCard";
import { academicKeys, subjectsQuery, timetableQuery } from "@/features/academic/queries";
import { DAYS_OF_WEEK, todayDayName, type Timetable } from "@/features/academic/types";
import { cn } from "@/lib/utils";
import { TimetableCalendar } from "@/features/calendar/TimetableCalendar";
import { ExportButton } from "@/features/reports/ExportDialog";

export const Route = createFileRoute("/_authenticated/dashboard/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TimetablePage,
});

function isCurrentClass(entry: Timetable): boolean {
  const today = todayDayName();
  if (entry.day_of_week !== today) return false;
  const now = new Date();
  const [sh, sm] = entry.start_time.split(":").map(Number);
  const [eh, em] = entry.end_time.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= start && cur < end;
}

function TimetablePage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const subjectsQ = useQuery(subjectsQuery(uid));
  const timetableQ = useQuery(timetableQuery(uid));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Timetable | null>(null);
  const [deleting, setDeleting] = useState<Timetable | null>(null);

  const subjectsById = useMemo(() => {
    const map = new Map(subjectsQ.data?.map((s) => [s.id, s]));
    return map;
  }, [subjectsQ.data]);

  const today = todayDayName();
  const entries = timetableQ.data ?? [];
  const todayEntries = entries.filter((e) => e.day_of_week === today);
  const byDay = useMemo(() => {
    const m = new Map<string, Timetable[]>();
    for (const d of DAYS_OF_WEEK) m.set(d, []);
    for (const e of entries) m.get(e.day_of_week)?.push(e);
    return m;
  }, [entries]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (uid) qc.invalidateQueries({ queryKey: academicKeys.timetable(uid) });
      toast.success("Class removed");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Could not delete"),
  });

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const renderEntries = (list: Timetable[]) =>
    list.length === 0 ? (
      <EmptyState
        icon={CalendarCheck}
        title="No classes scheduled"
        description="Add a class to see it here."
      />
    ) : (
      <div className="space-y-3">
        {list.map((e) => (
          <TimetableCard
            key={e.id}
            entry={e}
            subject={subjectsById.get(e.subject_id)}
            isCurrent={isCurrentClass(e)}
            onEdit={() => {
              setEditing(e);
              setDialogOpen(true);
            }}
            onDelete={() => setDeleting(e)}
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="View and manage your weekly class schedule."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton defaultKind="timetable" />
            <Button onClick={openAdd} className="bg-gradient-primary shadow-elegant hover:opacity-95">
              <Plus className="mr-1.5 h-4 w-4" /> Add class
            </Button>
          </div>
        }
      />

      {timetableQ.isLoading ? (
        <LoadingState label="Loading timetable..." />
      ) : (
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Weekly</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {renderEntries(todayEntries)}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <TimetableCalendar entries={entries} subjects={subjectsQ.data ?? []} />
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DAYS_OF_WEEK.map((d) => {
                const list = byDay.get(d) ?? [];
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    className={cn(
                      "rounded-2xl border p-4",
                      isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold">{d}</div>
                      {isToday && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                          Today
                        </span>
                      )}
                    </div>
                    {list.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        No classes
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {list.map((e) => (
                          <TimetableCard
                            key={e.id}
                            entry={e}
                            subject={subjectsById.get(e.subject_id)}
                            isCurrent={isCurrentClass(e)}
                            onEdit={() => {
                              setEditing(e);
                              setDialogOpen(true);
                            }}
                            onDelete={() => setDeleting(e)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        subjects={subjectsQ.data ?? []}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove class?"
        description="This entry will be removed from your timetable."
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}
