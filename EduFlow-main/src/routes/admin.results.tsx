import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LoadingState, EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/results")({
  ssr: false,
  component: AdminResultsPage,
});

// Actual shape returned by admin_results_overview() RPC (json_build_object).
type Overview = {
  overall_avg: number | null;
  total_assessments: number | null;
  total_marks_entries: number | null;
  pass_percentage: number | null;
  by_department: Array<{ id: string; name: string; total: number; avg_pct: number | null }> | null;
  by_faculty: Array<{ id: string; name: string; total: number; avg_pct: number | null }> | null;
  top_students: Array<{ id: string; name: string; roll_number: string | null; avg_pct: number | null; total: number }> | null;
  weak_students: Array<{ id: string; name: string; roll_number: string | null; avg_pct: number | null; total: number }> | null;
};

const fmtPct = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Number(v)}%`;
const fmtNum = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v);

function AdminResultsPage() {
  const q = useQuery({
    queryKey: ["admin-results-overview"],
    queryFn: async (): Promise<Overview> => {
      const { data, error } = await supabase.rpc("admin_results_overview");
      if (error) throw error;
      return (data ?? {}) as unknown as Overview;
    },
  });

  if (q.isLoading) return <LoadingState label="Loading analytics..." />;

  if (q.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Results & Analytics" />
        <EmptyState
          icon={Award}
          title="Couldn't load analytics"
          description={(q.error as Error)?.message ?? "Unexpected error"}
          action={
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
            </Button>
          }
        />
      </div>
    );
  }

  const o = q.data ?? ({} as Overview);
  const byDept = Array.isArray(o.by_department) ? o.by_department : [];
  const byFaculty = Array.isArray(o.by_faculty) ? o.by_faculty : [];
  const top = Array.isArray(o.top_students) ? o.top_students : [];
  const weak = Array.isArray(o.weak_students) ? o.weak_students : [];

  const totalAssessments = fmtNum(o.total_assessments);
  const totalEntries = fmtNum(o.total_marks_entries);
  const hasAnyData =
    totalAssessments > 0 || totalEntries > 0 || byDept.length > 0 || byFaculty.length > 0;

  const Kpi = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results & Analytics"
        description="Platform-wide performance across departments, faculty, and students."
        actions={
          <Button size="sm" variant="outline" onClick={() => q.refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Assessments" value={totalAssessments} />
        <Kpi label="Marks entered" value={totalEntries} />
        <Kpi label="Overall avg" value={fmtPct(o.overall_avg)} />
        <Kpi label="Pass %" value={fmtPct(o.pass_percentage)} />
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={Award}
          title="No assessments available yet."
          description="Analytics will appear once faculty publish assessments and enter marks."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="By Department">
            <Table
              head={["Department", "Marks", "Avg %"]}
              rows={byDept.map((d) => [d?.name ?? "—", fmtNum(d?.total), fmtPct(d?.avg_pct)])}
            />
          </Section>
          <Section title="By Faculty">
            <Table
              head={["Faculty", "Marks", "Avg %"]}
              rows={byFaculty.map((f) => [f?.name ?? "—", fmtNum(f?.total), fmtPct(f?.avg_pct)])}
            />
          </Section>
          <Section title="Top Performers">
            <Table
              head={["Roll", "Student", "Avg %"]}
              rows={top.map((s) => [s?.roll_number ?? "—", s?.name ?? "—", fmtPct(s?.avg_pct)])}
            />
          </Section>
          <Section title="Needs Attention">
            <Table
              head={["Roll", "Student", "Avg %"]}
              rows={weak.map((s) => [s?.roll_number ?? "—", s?.name ?? "—", fmtPct(s?.avg_pct)])}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-5 py-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  if (!rows || rows.length === 0)
    return <div className="p-6 text-center text-sm text-muted-foreground">No data yet</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{head.map((h) => (<th key={h} className="px-4 py-2">{h}</th>))}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => (<td key={j} className="px-4 py-2">{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
