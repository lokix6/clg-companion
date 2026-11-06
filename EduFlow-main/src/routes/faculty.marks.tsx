import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Plus, Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

const TYPES = ["Internal1","Internal2","Assignment","Lab","Seminar","Project","Other"] as const;

export const Route = createFileRoute("/faculty/marks")({
  ssr: false,
  component: FacultyMarksPage,
});

type Assessment = {
  id: string;
  title: string;
  assessment_type: string;
  max_marks: number;
  assessment_date: string | null;
  publish_status: "Draft" | "Published";
  catalog_subject_id: string;
  subject_code: string | null;
  subject_name: string;
  department_id: string | null;
  department_name: string | null;
  semester: number | null;
  total_students: number;
  entered_count: number;
};

function FacultyMarksPage() {
  const [selected, setSelected] = useState<Assessment | null>(null);
  return selected ? <MarksSheet assessment={selected} onBack={() => setSelected(null)} /> : <AssessmentList onOpen={setSelected} />;
}

function AssessmentList({ onOpen }: { onOpen: (a: Assessment) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const list = useQuery({
    queryKey: ["faculty-assessments"],
    queryFn: async (): Promise<Assessment[]> => {
      const { data, error } = await supabase.rpc("faculty_list_assessments");
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });
  const subjects = useQuery({
    queryKey: ["faculty-catalog-for-marks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("faculty_catalog_subjects");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; subject_code: string | null; subject_name: string; department_id: string | null; semester: number | null }>;
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ catalog_subject_id: "", title: "", assessment_type: "Internal1", max_marks: "20", assessment_date: "", publish_status: "Draft" as "Draft" | "Published" });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.catalog_subject_id) throw new Error("Choose subject");
      const sub = subjects.data?.find((s) => s.id === form.catalog_subject_id);
      const { error } = await supabase.from("assessments").insert({
        catalog_subject_id: form.catalog_subject_id,
        department_id: sub?.department_id,
        semester: sub?.semester,
        title: form.title.trim(),
        assessment_type: form.assessment_type,
        max_marks: Number(form.max_marks),
        assessment_date: form.assessment_date || null,
        publish_status: form.publish_status,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty-assessments"] });
      setOpen(false);
      setForm({ catalog_subject_id: "", title: "", assessment_type: "Internal1", max_marks: "20", assessment_date: "", publish_status: "Draft" });
      toast.success("Assessment created");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const publish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Draft" | "Published" }) => {
      const { error } = await supabase.from("assessments").update({ publish_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculty-assessments"] }); toast.success("Updated"); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks & Assessments"
        description="Create internals, labs, seminars, and projects. Enter marks and publish results."
        actions={<Button onClick={() => setOpen((v) => !v)} className="bg-gradient-primary shadow-elegant"><Plus className="mr-1.5 h-4 w-4" /> New assessment</Button>}
      />
      {open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs">Subject *</Label>
              <Select value={form.catalog_subject_id} onValueChange={(v) => setForm({ ...form, catalog_subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_code ? `${s.subject_code} — ` : ""}{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-Sem I" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.assessment_type} onValueChange={(v) => setForm({ ...form, assessment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Max marks</Label>
              <Input type="number" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.publish_status} onValueChange={(v) => setForm({ ...form, publish_status: v as "Draft" | "Published" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-primary shadow-elegant">Create</Button>
            </div>
          </div>
        </div>
      )}
      {list.isLoading ? (
        <LoadingState label="Loading..." />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Award} title="No assessments yet" description="Create your first assessment." />
      ) : (
        <div className="grid gap-3">
          {(list.data ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{a.assessment_type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.publish_status === "Published" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{a.publish_status}</span>
                  <span className="text-xs text-muted-foreground">Max: {a.max_marks}</span>
                  {a.assessment_date && <span className="text-xs text-muted-foreground">· {a.assessment_date}</span>}
                </div>
                <div className="mt-1 text-sm font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.subject_code ? `${a.subject_code} — ` : ""}{a.subject_name}
                  {a.department_name ? ` · ${a.department_name}` : ""}{a.semester ? ` · Sem ${a.semester}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.entered_count}/{a.total_students} marks entered</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => publish.mutate({ id: a.id, status: a.publish_status === "Published" ? "Draft" : "Published" })}>
                  {a.publish_status === "Published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" onClick={() => onOpen(a)} className="bg-gradient-primary">Enter marks</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarksSheet({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["assessment-students", assessment.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("faculty_assessment_students", { _assessment_id: assessment.id });
      if (error) throw error;
      return (data ?? []) as Array<{ student_id: string; full_name: string | null; email: string; roll_number: string | null; obtained_marks: number | null; remarks: string | null; faculty_comment: string | null }>;
    },
  });
  const [edits, setEdits] = useState<Record<string, { obtained: string; remarks: string; comment: string }>>({});

  const rows = useMemo(() => {
    return (q.data ?? []).map((r) => {
      const e = edits[r.student_id];
      return {
        student_id: r.student_id,
        name: r.full_name ?? r.email,
        roll: r.roll_number ?? "—",
        obtained: e?.obtained ?? (r.obtained_marks != null ? String(r.obtained_marks) : ""),
        remarks: e?.remarks ?? (r.remarks ?? ""),
        comment: e?.comment ?? (r.faculty_comment ?? ""),
      };
    });
  }, [q.data, edits]);

  const set = (id: string, field: "obtained" | "remarks" | "comment", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { obtained: "", remarks: "", comment: "" }), [field]: value },
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const entries = rows
        .filter((r) => r.obtained !== "" || r.remarks !== "" || r.comment !== "")
        .map((r) => ({
          student_id: r.student_id,
          obtained_marks: r.obtained === "" ? null : Number(r.obtained),
          remarks: r.remarks || null,
          faculty_comment: r.comment || null,
        }));
      const { data, error } = await supabase.rpc("faculty_save_marks", { _assessment_id: assessment.id, _entries: entries });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment-students", assessment.id] });
      qc.invalidateQueries({ queryKey: ["faculty-assessments"] });
      setEdits({});
      toast.success("Marks saved");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={assessment.title}
        description={`${assessment.subject_name} · Max ${assessment.max_marks}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-primary shadow-elegant"><Save className="mr-1.5 h-4 w-4" /> Save marks</Button>
          </div>
        }
      />
      {q.isLoading ? (
        <LoadingState label="Loading roster..." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Award} title="No students" description="No students match this subject's department/semester." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 w-32">Marks / {assessment.max_marks}</th>
                  <th className="px-4 py-3 w-48">Remarks</th>
                  <th className="px-4 py-3 w-64">Faculty comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.student_id}>
                    <td className="px-4 py-2 font-mono text-xs">{r.roll}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">
                      <Input type="number" step="0.5" min="0" max={assessment.max_marks} value={r.obtained} onChange={(e) => set(r.student_id, "obtained", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={r.remarks} onChange={(e) => set(r.student_id, "remarks", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <Textarea rows={1} value={r.comment} onChange={(e) => set(r.student_id, "comment", e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
