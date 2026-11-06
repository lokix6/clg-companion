import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  departments: { name: string } | null;
  target_semester: number | null;
};

function CalendarList({ title, description }: { title: string; description: string }) {
  const q = useQuery({
    queryKey: ["academic-calendar", "read"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_calendar")
        .select("*, departments(name)")
        .gte("start_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        .order("start_date");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      {q.isLoading ? (
        <LoadingState label="Loading..." />
      ) : (q.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming events" />
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{e.event_type}</span>
                <span className="text-xs text-muted-foreground">
                  {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ""}
                </span>
                {e.departments && <span className="text-xs text-muted-foreground">· {e.departments.name}</span>}
                {e.target_semester && <span className="text-xs text-muted-foreground">· Sem {e.target_semester}</span>}
              </div>
              <div className="mt-1 text-sm font-semibold">{e.title}</div>
              {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Academic Calendar — EduFlow" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <CalendarList title="Academic Calendar" description="Holidays, examinations, deadlines and campus events." />,
});
