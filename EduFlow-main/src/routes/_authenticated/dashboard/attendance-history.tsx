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
import { InfoCard } from "@/components/dashboard/InfoCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subjectsQuery } from "@/features/academic/queries";
import {
  attendanceHistoryKeys,
  attendanceHistoryQuery,
} from "@/features/attendance-history/queries";
import {
  computeHistoryStats,
  computeOverallTrend,
  computeRunningHistory,
} from "@/features/attendance-history/analytics";
import { AttendanceTrendChart } from "@/features/attendance-history/AttendanceTrendChart";
import { AttendanceTimeline } from "@/features/attendance-history/AttendanceTimeline";
import { AttendanceTable } from "@/features/attendance-history/AttendanceTable";
import { AttendanceHistoryDialog } from "@/features/attendance-history/AttendanceHistoryDialog";
import { monthKey, type AttendanceHistory } from "@/features/attendance-history/types";

export const Route = createFileRoute("/_authenticated/dashboard/attendance-history")({
  head: () => ({
    meta: [
      { title: "Attendance History — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const subjectsQ = useQuery(subjectsQuery(uid));
  const historyQ = useQuery(attendanceHistoryQuery(uid));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceHistory | null>(null);
  const [deleting, setDeleting] = useState<AttendanceHistory | null>(null);

  const records = historyQ.data ?? [];
  const subjectsMap = useMemo(
    () => new Map((subjectsQ.data ?? []).map((s) => [s.id, s])),
    [subjectsQ.data],
  );
  const points = useMemo(() => computeRunningHistory(records), [records]);
  const trend = useMemo(() => computeOverallTrend(records), [records]);
  const stats = useMemo(
    () => computeHistoryStats(records, monthKey(new Date().toISOString().slice(0, 10))),
    [records],
  );

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (uid) qc.invalidateQueries({ queryKey: attendanceHistoryKeys.all(uid) });
      toast.success("Record deleted");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance History"
        description="Track every class you attended or missed and see your progress over time."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Log attendance
          </Button>
        }
      />

      {historyQ.isLoading ? (
        <LoadingState label="Loading history..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance recorded yet"
          description="Log your first class to start building your attendance trend."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatMini label="Overall %" value={`${stats.currentPercent.toFixed(1)}%`} />
            <StatMini label="This month" value={`${stats.monthPercent.toFixed(1)}%`} />
            <StatMini label="Classes attended" value={String(stats.present)} />
            <StatMini label="Classes missed" value={String(stats.absent)} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 text-sm font-semibold">Attendance trend</div>
            <AttendanceTrendChart data={trend} />
          </div>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4">
              <AttendanceTimeline
                points={points}
                records={records}
                subjects={subjectsMap}
                onEdit={(r) => {
                  setEditing(r);
                  setDialogOpen(true);
                }}
                onDelete={(r) => setDeleting(r)}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-4">
              <AttendanceTable
                points={points}
                records={records}
                subjects={subjectsMap}
                onEdit={(r) => {
                  setEditing(r);
                  setDialogOpen(true);
                }}
                onDelete={(r) => setDeleting(r)}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <AttendanceHistoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjects={subjectsQ.data ?? []}
        entry={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete record?"
        description="This attendance entry will be removed."
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting.id);
        }}
      />
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <InfoCard className="p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </InfoCard>
  );
}
