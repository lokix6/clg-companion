import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/card";
import { adminQuizStatsQuery } from "@/features/ai/queries";

export const Route = createFileRoute("/admin/quizzes")({
  head: () => ({
    meta: [
      { title: "Quiz Analytics — Admin · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useQuery(adminQuizStatsQuery());
  return (
    <div className="space-y-6">
      <PageHeader title="Quiz Analytics" description="Platform-wide quiz activity across faculty and departments." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total quizzes" value={data?.total_quizzes ?? 0} />
        <StatCard label="Assigned" value={data?.assigned_quizzes ?? 0} />
        <StatCard label="Attempts" value={data?.total_attempts ?? 0} />
        <StatCard label="Average score" value={data?.avg_score != null ? `${data.avg_score}%` : "—"} />
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">By department</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground text-xs uppercase">
            <tr><th className="py-2">Department</th><th>Attempts</th><th>Avg %</th></tr>
          </thead>
          <tbody>
            {(data?.by_department ?? []).map((r, i) => (
              <tr key={i} className="border-t"><td className="py-2">{r.name}</td><td>{r.attempts}</td><td>{r.avg_pct ?? "—"}</td></tr>
            ))}
            {(data?.by_department ?? []).length === 0 && (
              <tr><td colSpan={3} className="py-4 text-muted-foreground text-center">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">By faculty</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground text-xs uppercase">
            <tr><th className="py-2">Faculty</th><th>Quizzes</th><th>Attempts</th><th>Avg %</th></tr>
          </thead>
          <tbody>
            {(data?.by_faculty ?? []).map((r, i) => (
              <tr key={i} className="border-t">
                <td className="py-2">{r.name}</td><td>{r.quizzes}</td><td>{r.attempts}</td><td>{r.avg_pct ?? "—"}</td>
              </tr>
            ))}
            {(data?.by_faculty ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-4 text-muted-foreground text-center">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </Card>
  );
}
