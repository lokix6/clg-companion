import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Upload,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import {
  importStudents,
  type StudentImportResult,
  type StudentImportRow,
} from "@/lib/students-import.functions";
import { adminKeys } from "@/features/admin/queries";

export const Route = createFileRoute("/admin/students-import")({
  component: StudentImportPage,
});

const SAMPLE_CSM_B_SEM1: Array<{ roll_number: string; full_name: string }> = [
  { roll_number: "A23126552071", full_name: "Sai Subrahmanyam Boggarapu" },
  { roll_number: "A23126552072", full_name: "Harsha Vardhan Botta" },
  { roll_number: "A23126552073", full_name: "Kona Hima Bindhu Cheerala" },
  { roll_number: "A23126552074", full_name: "Venkata Hari Sri Santhosh Chintapenta" },
  { roll_number: "A23126552075", full_name: "Uma Nagesh Duda" },
  { roll_number: "A23126552076", full_name: "Lakshith Kumar Dharmireddi" },
  { roll_number: "A23126552077", full_name: "Rajeev Sanjay Donkana" },
  { roll_number: "A23126552078", full_name: "Satya Sai Edubilli" },
  { roll_number: "A23126552079", full_name: "Manohar Reddy Gangavarapu" },
  { roll_number: "A23126552080", full_name: "Vasanth Deepak Gorantla" },
  { roll_number: "A23126552081", full_name: "Partha Sai Janka" },
  { roll_number: "A23126552082", full_name: "Jyothsna Jarugulla" },
  { roll_number: "A23126552083", full_name: "Balaji Kantubukta" },
  { roll_number: "A23126552084", full_name: "Hemanth Karukola" },
  { roll_number: "A23126552085", full_name: "Anil Kasa" },
];

type ParsedRow = {
  roll_number: string;
  full_name: string;
  section?: string;
  semester?: string | number;
  department?: string;
  email?: string;
};

type Dept = { id: string; name: string; code: string | null };

const departmentsQuery = queryOptions({
  queryKey: ["import", "departments"],
  queryFn: async (): Promise<Dept[]> => {
    const { data, error } = await supabase.from("departments").select("id,name,code").order("name");
    if (error) throw error;
    return (data ?? []) as Dept[];
  },
  staleTime: 60_000,
});

const CANONICAL: Record<string, keyof ParsedRow> = {
  "roll no": "roll_number",
  "roll number": "roll_number",
  "rollno": "roll_number",
  "roll_no": "roll_number",
  "roll_number": "roll_number",
  "regno": "roll_number",
  "reg no": "roll_number",
  "name": "full_name",
  "student name": "full_name",
  "full_name": "full_name",
  "fullname": "full_name",
  "section": "section",
  "sec": "section",
  "semester": "semester",
  "sem": "semester",
  "department": "department",
  "dept": "department",
  "branch": "department",
  "email": "email",
};

function normaliseHeader(h: string): keyof ParsedRow | null {
  const key = h.trim().toLowerCase();
  return CANONICAL[key] ?? null;
}

function normaliseRows(raw: Record<string, unknown>[]): ParsedRow[] {
  return raw
    .map((r) => {
      const out: ParsedRow = { roll_number: "", full_name: "" };
      for (const [k, v] of Object.entries(r)) {
        const canonical = normaliseHeader(k);
        if (!canonical || v == null) continue;
        (out as Record<string, unknown>)[canonical] = String(v).trim();
      }
      return out;
    })
    .filter((r) => r.roll_number && r.full_name);
}

function StudentImportPage() {
  const qc = useQueryClient();
  const depts = useQuery(departmentsQuery);

  const [department_id, setDepartmentId] = useState("");
  const [section, setSection] = useState("B");
  const [semester, setSemester] = useState("1");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [lastResult, setLastResult] = useState<StudentImportResult | null>(null);

  const call = useServerFn(importStudents);
  const importMut = useMutation({
    mutationFn: async (payload: { rows: StudentImportRow[] }) => call({ data: payload }),
    onSuccess: (res) => {
      setLastResult(res);
      qc.invalidateQueries({ queryKey: adminKeys.students() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      toast.success(
        `Imported ${res.created} • updated ${res.updated}${res.errors.length ? ` • ${res.errors.length} errors` : ""}`,
      );
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Import failed");
    },
  });

  const preview = useMemo(() => {
    return rows.slice(0, 100).map((r) => ({
      roll_number: r.roll_number.toUpperCase(),
      full_name: r.full_name,
      section: (r.section || section).toUpperCase(),
      semester: Number(r.semester || semester),
      // Email must be provided per row — no deterministic fallback.
      email: (r.email || "").trim().toLowerCase(),
    }));
  }, [rows, section, semester]);

  const canImport =
    preview.length > 0 &&
    !!department_id &&
    Number(semester) > 0 &&
    section.trim().length > 0 &&
    !importMut.isPending;

  function loadSample() {
    setSection("B");
    setSemester("1");
    // pre-select CSM department if present
    const csm = depts.data?.find(
      (d) => d.code?.toUpperCase() === "CSM" || d.name.toUpperCase().includes("CSM"),
    );
    if (csm) setDepartmentId(csm.id);
    setRows(SAMPLE_CSM_B_SEM1.map((s) => ({ ...s, section: "B", semester: "1" })));
    setCsvText(
      "roll_number,full_name\n" +
        SAMPLE_CSM_B_SEM1.map((s) => `${s.roll_number},${s.full_name}`).join("\n"),
    );
    setLastResult(null);
  }

  function handleCsvParse() {
    if (!csvText.trim()) {
      toast.error("Paste CSV content first");
      return;
    }
    const result = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length) {
      toast.error(result.errors[0]?.message ?? "CSV parse failed");
      return;
    }
    const parsed = normaliseRows(result.data);
    if (parsed.length === 0) {
      toast.error("No valid rows. Expect columns: roll_number, full_name");
      return;
    }
    setRows(parsed);
    toast.success(`Parsed ${parsed.length} rows`);
  }

  async function handleFile(file: File) {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".csv") || file.type === "text/csv") {
        const text = await file.text();
        setCsvText(text);
        const result = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        });
        const parsed = normaliseRows(result.data);
        setRows(parsed);
        toast.success(`Parsed ${parsed.length} rows from CSV`);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const parsed = normaliseRows(json);
        setRows(parsed);
        setCsvText(XLSX.utils.sheet_to_csv(sheet));
        toast.success(`Parsed ${parsed.length} rows from Excel`);
      } else {
        toast.error("Unsupported file. Use CSV or XLSX.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    }
  }

  function submit() {
    if (!department_id) return toast.error("Select a department");
    if (!section.trim()) return toast.error("Section is required");
    const semN = Number(semester);
    if (!semN || semN < 1) return toast.error("Semester is required");

    const payload: StudentImportRow[] = preview.map((p) => ({
      roll_number: p.roll_number,
      full_name: p.full_name,
      department_id,
      section: p.section,
      semester: p.semester,
      email: p.email,
    }));
    importMut.mutate({ rows: payload });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Import"
        description="Bulk-onboard students from CSV or Excel. Generates login accounts, assigns them to a department, section and semester."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department_id} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {(depts.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.code ? `${d.code} — ${d.name}` : d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} placeholder="B" />
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              These act as defaults for rows that don't include section/semester columns.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Upload or paste roster</h3>
                <p className="text-xs text-muted-foreground">
                  Columns supported: roll_number, full_name, email (required); section, semester (optional).
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadSample}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Load CSM-B sample
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setRows([]); setCsvText(""); setLastResult(null); }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm hover:bg-muted/40">
                <Upload className="h-4 w-4" />
                <span>Upload CSV / XLSX</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button size="sm" variant="secondary" onClick={handleCsvParse}>
                <FileText className="mr-1 h-3.5 w-3.5" /> Parse pasted CSV
              </Button>
            </div>

            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"roll_number,full_name\nA23126552071,Sai Subrahmanyam Boggarapu"}
              className="min-h-[140px] font-mono text-xs"
            />
          </div>

          {preview.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="text-sm font-semibold">Preview ({preview.length})</div>
                <Button size="sm" disabled={!canImport} onClick={submit}>
                  {importMut.isPending ? (
                    <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Importing…</>
                  ) : (
                    <><FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Import {preview.length} students</>
                  )}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Roll No</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Section</th>
                      <th className="px-4 py-2 font-medium">Sem</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((r) => (
                      <tr key={r.roll_number} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{r.roll_number}</td>
                        <td className="px-4 py-2">{r.full_name}</td>
                        <td className="px-4 py-2">{r.section}</td>
                        <td className="px-4 py-2">{r.semester}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{r.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">How it works</h3>
            <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>1. Choose the department, section and semester defaults.</li>
              <li>2. Upload a CSV/Excel roster or paste rows with <code className="font-mono">roll_number, full_name</code>.</li>
              <li>3. Review the preview and click Import.</li>
              <li>4. Each new student is created with the email you provided in the roster and a unique cryptographically-random temporary password (shown below after import — copy and share it out-of-band).</li>
              <li>5. Students are forced to change their password on first login.</li>
            </ol>
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
              Existing accounts with the same roll number / email are updated in place, never duplicated.
            </div>
          </div>

          {lastResult && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
              <h3 className="text-sm font-semibold">Last import</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {lastResult.created} created
                </Badge>
                <Badge variant="secondary">{lastResult.updated} updated</Badge>
                {lastResult.errors.length > 0 && (
                  <Badge className="bg-destructive/10 text-destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {lastResult.errors.length} errors
                  </Badge>
                )}
              </div>
              {lastResult.errors.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                  {lastResult.errors.map((e) => (
                    <div key={e.roll_number} className="py-1">
                      <span className="font-mono">{e.roll_number}</span>{" "}
                      <span className="text-destructive">— {e.error}</span>
                    </div>
                  ))}
                </div>
              )}
              {lastResult.items.some((it) => it.temporary_password) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold">Temporary passwords (copy & share securely)</div>
                  <div className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                    {lastResult.items
                      .filter((it) => it.temporary_password)
                      .map((it) => (
                        <div key={it.roll_number} className="flex items-center justify-between gap-2 py-1">
                          <span className="font-mono">{it.roll_number}</span>
                          <span className="truncate text-muted-foreground">{it.email}</span>
                          <code className="rounded bg-background px-2 py-0.5 font-mono">{it.temporary_password}</code>
                        </div>
                      ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    These are shown once and won't appear again after you leave this page. Share with each student privately.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
