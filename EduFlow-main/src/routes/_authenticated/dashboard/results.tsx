import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  catalog_subject_id: string;
  subject_code: string | null;
  subject_name: string;
  assessment_id: string;
  assessment_title: string;
  assessment_type: string;
  max_marks: number;
  obtained_marks: number | null;
  remarks: string | null;
  faculty_comment: string | null;
  assessment_date: string | null;
  faculty_name: string | null;
};

export const Route = createFileRoute("/_authenticated/dashboard/results")({
  head: () => ({ meta: [{ title: "Results — EduFlow" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: StudentResultsPage,
});

function StudentResultsPage() {
  const q = useQuery({
    queryKey: ["student-my-results"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("student_my_results");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const bySubject = useMemo(() => {
    const m = new Map<string, { name: string; code: string | null; rows: Row[]; total: number; earned: number }>();
    (q.data ?? []).forEach((r) => {
      const key = r.catalog_subject_id;
      if (!m.has(key)) m.set(key, { name: r.subject_name, code: r.subject_code, rows: [], total: 0, earned: 0 });
      const g = m.get(key)!;
      g.rows.push(r);
      g.total += Number(r.max_marks);
      g.earned += Number(r.obtained_marks ?? 0);
    });
    return Array.from(m.values());
  }, [q.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Results" description="Your marks across all published assessments." />
      {q.isLoading ? (
        <LoadingState label="Loading..." />
      ) : bySubject.length === 0 ? (
        <EmptyState icon={Award} title="No results yet" description="Your marks will appear here once faculty publishes assessments." />
      ) : (
        <div className="space-y-6">
          {bySubject.map((s) => {
            const pct = s.total > 0 ? Math.round((s.earned / s.total) * 100) : 0;
            const pass = pct >= 40;
            return (
              <div key={s.name} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
                  <div>
                    <div className="text-sm font-semibold">{s.code ? `${s.code} — ` : ""}{s.name}</div>
                    <div className="text-xs text-muted-foreground">Total: {s.earned} / {s.total}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums">{pct}%</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pass ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>{pass ? "Pass" : "Fail"}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Assessment</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Marks</th>
                        <th className="px-4 py-2">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {s.rows.map((r) => (
                        <tr key={r.assessment_id}>
                          <td className="px-4 py-2 font-medium">{r.assessment_title}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.assessment_type}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.assessment_date ?? "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.obtained_marks != null ? `${r.obtained_marks} / ${r.max_marks}` : `— / ${r.max_marks}`}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{r.faculty_comment ?? r.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
