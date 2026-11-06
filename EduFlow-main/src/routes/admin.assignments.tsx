import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileCheck, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminStatCard } from "@/features/admin/AdminStatCard";
import { adminAssignmentOverviewQuery } from "@/features/assignments/queries";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({
    meta: [
      { title: "Assignment Analytics — EduFlow" },
      { name: "description", content: "Review assignment and submission analytics across EduFlow." },
      { property: "og:title", content: "Assignment Analytics — EduFlow" },
      { property: "og:description", content: "Review assignment and submission analytics across EduFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAssignmentsPage,
});

function AdminAssignmentsPage() {
  const q = useQuery(adminAssignmentOverviewQuery());
  const d = q.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments Analytics"
        description="Platform-wide assignment activity across departments and faculty."
      />

      {q.isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Loading assignment analytics…
        </div>
      )}

      {q.isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn’t load assignment analytics.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(q.error as Error)?.message || "Unknown error"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <AdminStatCard label="Total assignments" value={d?.total_assignments ?? 0} icon={ClipboardList} />
        <AdminStatCard label="Total submissions" value={d?.total_submissions ?? 0} icon={FileCheck} />
        <AdminStatCard label="Pending reviews" value={d?.pending_reviews ?? 0} icon={Clock} />
        <AdminStatCard label="Reviewed" value={d?.reviewed ?? 0} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">By department</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Assignments</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d?.by_department ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.assignments}</TableCell>
                    <TableCell className="text-right">{r.submissions}</TableCell>
                    <TableCell className="text-right">{r.pending}</TableCell>
                  </TableRow>
                ))}
                {(d?.by_department ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">By faculty</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead className="text-right">Assignments</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d?.by_faculty ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.assignments}</TableCell>
                    <TableCell className="text-right">{r.submissions}</TableCell>
                    <TableCell className="text-right">{r.pending}</TableCell>
                  </TableRow>
                ))}
                {(d?.by_faculty ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No faculty activity yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
