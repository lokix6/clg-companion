import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Play, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import {
  REPORTS,
  findReport,
  getReportsForRole,
  type ChartSpec,
  type ReportDefinition,
  type ReportFilters,
  type ReportResult,
  type ReportRole,
} from "./definitions";
import { FilterField, FILTER_LABELS } from "./FilterField";
import { runExport, type ExportFormat } from "./exporters";
import { deleteReportHistory, logReportHistory, reportHistoryQuery } from "./history";
import type { ReportContext } from "./branding";

const CHART_COLORS = ["#5850ec", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#14b8a6"];

function isMeaningfulChart(spec: ChartSpec): boolean {
  const data = spec.data ?? [];
  if (data.length < 2) return false;
  if (!data.some((d) => Number(d.value) > 0)) return false;
  return true;
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  const horizontal = spec.type === "bar" && spec.orientation === "horizontal";
  const isDonut = spec.type === "pie" && spec.variant === "donut";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{spec.title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "bar" ? (
            <BarChart data={spec.data} layout={horizontal ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              {horizontal ? (
                <>
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={110} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                </>
              )}
              <Tooltip />
              <Bar dataKey="value" fill="#5850ec" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
            </BarChart>
          ) : spec.type === "line" ? (
            <LineChart data={spec.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#5850ec" strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Pie
                data={spec.data}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                innerRadius={isDonut ? 45 : 0}
                paddingAngle={isDonut ? 2 : 0}
                label
              >
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}



function ReportRunner({
  def,
  role,
}: {
  def: ReportDefinition;
  role: ReportRole;
}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ReportFilters>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const runMut = useMutation({
    mutationFn: async () => def.fetch(filters),
    onSuccess: (r) => {
      setResult(r);
      setPage(1);
      toast.success("Report generated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate report"),
  });

  const ctx: ReportContext = useMemo(
    () => ({ role, profile, filters, filterLabels: FILTER_LABELS }),
    [role, profile, filters],
  );

  const doExport = async (format: ExportFormat) => {
    if (!result) return;
    runExport(format, result.payload, ctx);
    if (user) {
      await logReportHistory({
        userId: user.id,
        role,
        kind: def.id,
        name: result.payload.title,
        format,
        filters: filters as Record<string, unknown>,
        rowCount: result.payload.rows.length,
        generatedByName: profile?.full_name || profile?.email || null,
      });
      qc.invalidateQueries({ queryKey: ["report_history", role] });
    }
    toast.success(`${format.toUpperCase()} downloaded`);
  };

  const filteredRows = useMemo(() => {
    if (!result) return [];
    if (!search) return result.payload.rows;
    const q = search.toLowerCase();
    return result.payload.rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [result, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{def.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{def.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {def.filters.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {def.filters.map((fk) => (
                <FilterField
                  key={fk}
                  fkey={fk}
                  value={filters[fk] ?? ""}
                  filters={filters}
                  onChange={(v) => setFilters((f) => ({ ...f, [fk]: v }))}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
              {runMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Generate
            </Button>
            <Button variant="outline" onClick={() => { setFilters({}); setResult(null); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" disabled={!result} onClick={() => doExport("pdf")}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" disabled={!result} onClick={() => doExport("xlsx")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" disabled={!result} onClick={() => doExport("csv")}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {runMut.isPending && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {result && (
        <>
          {result.kpis.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.kpis.map((k, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                    <div className="mt-1 text-2xl font-bold">{k.value}</div>
                    {k.hint && <div className="text-xs text-muted-foreground">{k.hint}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(() => {
            const visibleCharts = result.charts.filter(isMeaningfulChart);
            if (visibleCharts.length === 0) return null;
            return (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleCharts.map((c, i) => <ChartBlock key={i} spec={c} />)}
              </div>
            );
          })()}


          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <CardTitle className="text-sm">Data ({filteredRows.length})</CardTitle>
              <div className="relative ml-auto w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search rows" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
            </CardHeader>
            <CardContent>
              {filteredRows.length === 0 ? (
                <EmptyState title="No data" description="Adjust the filters and try again." />
              ) : (
                <>
                  <div className="overflow-x-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {result.payload.columns.map((c) => (
                            <TableHead key={c.key} className={cn(c.align === "right" && "text-right")}>{c.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageRows.map((r, i) => (
                          <TableRow key={i}>
                            {result.payload.columns.map((c) => (
                              <TableCell key={c.key} className={cn(c.align === "right" && "text-right tabular-nums")}>
                                {c.format ? c.format(r[c.key], r) : String(r[c.key] ?? "—")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ReportHistoryPanel({ role }: { role: ReportRole }) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const historyQ = useQuery(reportHistoryQuery(role));
  const delMut = useMutation({
    mutationFn: (id: string) => deleteReportHistory(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["report_history", role] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redownload = async (row: { kind: string; format: "pdf" | "xlsx" | "csv"; filters: Record<string, unknown>; name: string }) => {
    const def = findReport(row.kind);
    if (!def) return toast.error("Report definition not found");
    try {
      const r = await def.fetch(row.filters as ReportFilters);
      runExport(row.format, r.payload, { role, profile, filters: row.filters, filterLabels: FILTER_LABELS });
      if (user) {
        await logReportHistory({
          userId: user.id,
          role,
          kind: def.id,
          name: r.payload.title,
          format: row.format,
          filters: row.filters,
          rowCount: r.payload.rows.length,
          generatedByName: profile?.full_name || profile?.email || null,
        });
        qc.invalidateQueries({ queryKey: ["report_history", role] });
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Report History</CardTitle>
        <p className="text-xs text-muted-foreground">Your last {historyQ.data?.length ?? 0} generated reports.</p>
      </CardHeader>
      <CardContent>
        {historyQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (historyQ.data ?? []).length === 0 ? (
          <EmptyState title="No history yet" description="Generate a report to see it here." />
        ) : (
          <ul className="divide-y">
            {(historyQ.data ?? []).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{h.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="uppercase">{h.format}</Badge>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                    <span>• {h.row_count} rows</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" title="Download again" onClick={() => redownload(h)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => delMut.mutate(h.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsPage({ role, title, description }: { role: ReportRole; title: string; description: string }) {
  const defs = useMemo(() => getReportsForRole(role), [role]);
  const [activeId, setActiveId] = useState<string>(defs[0]?.id ?? "");
  const active = defs.find((d) => d.id === activeId) ?? defs[0];

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <Card className="lg:sticky lg:top-4 lg:h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="flex flex-col gap-1">
              {defs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active?.id === d.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                  )}
                >
                  {d.title}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="min-w-0">
          {active ? <ReportRunner def={active} role={role} /> : <EmptyState title="No reports available" description="" />}
        </div>

        <div className="lg:sticky lg:top-4 lg:h-fit">
          <ReportHistoryPanel role={role} />
        </div>
      </div>
    </div>
  );
}

export { REPORTS };
