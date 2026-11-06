import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Slot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_code: string | null;
  subject_name: string;
  department_name: string | null;
  semester: number | null;
  classroom_name: string | null;
  section_name: string | null;
};

export const Route = createFileRoute("/faculty/timetable")({
  ssr: false,
  component: FacultyTimetablePage,
});

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function FacultyTimetablePage() {
  const q = useQuery({
    queryKey: ["timetable-for-faculty"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase.rpc("timetable_for_faculty");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const today = useMemo(() => {
    const idx = new Date().getDay();
    return DAYS[idx === 0 ? 6 : idx - 1];
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    DAYS.forEach((d) => m.set(d, []));
    (q.data ?? []).forEach((s) => m.get(s.day_of_week)?.push(s));
    m.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return m;
  }, [q.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="My Timetable" description="Your weekly teaching schedule." />
      {q.isLoading ? (
        <LoadingState label="Loading..." />
      ) : (q.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarClock} title="No classes scheduled" description="Administration hasn't scheduled classes for your subjects yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((d) => {
            const list = byDay.get(d) ?? [];
            const isToday = d === today;
            return (
              <div key={d} className={cn("rounded-2xl border p-4", isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">{d}</div>
                  {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Today</span>}
                </div>
                {list.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No classes</div>
                ) : (
                  <div className="space-y-2">
                    {list.map((s) => (
                      <div key={s.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</span>
                          {s.classroom_name && <span>{s.classroom_name}</span>}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{s.subject_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.department_name}{s.semester ? ` · Sem ${s.semester}` : ""}{s.section_name ? ` · ${s.section_name}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
