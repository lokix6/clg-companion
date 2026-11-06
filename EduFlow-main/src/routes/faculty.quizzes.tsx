import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, ListChecks, Send, Trash2, BarChart3, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AssignQuizDialog } from "@/features/quiz/AssignQuizDialog";
import { ManualQuizDialog } from "@/features/quiz/ManualQuizDialog";
import { aiKeys, quizzesQuery, facultyQuizAnalyticsQuery, type AiQuiz } from "@/features/ai/queries";
import { deleteQuiz } from "@/lib/quiz.functions";

export const Route = createFileRoute("/faculty/quizzes")({
  head: () => ({
    meta: [
      { title: "My Quizzes — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const list = useQuery(quizzesQuery());
  const analytics = useQuery(facultyQuizAnalyticsQuery());
  const [assigning, setAssigning] = useState<AiQuiz | null>(null);
  const [previewing, setPreviewing] = useState<AiQuiz | null>(null);
  const [deleting, setDeleting] = useState<AiQuiz | null>(null);
  const [manual, setManual] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const delFn = useServerFn(deleteQuiz);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { quizId: id } }),
    onSuccess: async () => {
      toast.success("Quiz deleted");
      await qc.invalidateQueries({ queryKey: aiKeys.quizzes() });
      await qc.invalidateQueries({ queryKey: aiKeys.facultyAnalytics() });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = list.data ?? [];
  const target = assigning ?? (pendingId ? rows.find((q) => q.id === pendingId) ?? null : null);
  const stats = analytics.data;

  const grouped = useMemo(() => ({
    drafts: rows.filter((q) => q.status === "draft" || q.status === "generated"),
    assigned: rows.filter((q) => q.status === "assigned"),
    closed: rows.filter((q) => q.status === "closed"),
  }), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Quizzes"
        description="Manage AI-generated quizzes: preview, edit, assign to students, and review analytics."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setManual(true)}>
              Assign the Quiz Manually
            </Button>
            <Button asChild>
              <Link to="/faculty/quiz-generator">+ New Quiz</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total quizzes" value={stats?.total ?? 0} />
        <StatCard label="Assigned" value={stats?.assigned ?? 0} />
        <StatCard label="Attempts" value={stats?.total_attempts ?? 0} />
        <StatCard label="Average score" value={stats?.avg_score != null ? `${stats.avg_score}%` : "—"} />
      </div>

      <Section title="Assigned" items={grouped.assigned} onAssign={setAssigning} onPreview={setPreviewing} onDelete={setDeleting} />
      <Section title="Drafts" items={grouped.drafts} onAssign={setAssigning} onPreview={setPreviewing} onDelete={setDeleting} />
      <Section title="Closed" items={grouped.closed} onAssign={setAssigning} onPreview={setPreviewing} onDelete={setDeleting} />

      <ManualQuizDialog open={manual} onOpenChange={setManual} onCreated={(id) => setPendingId(id)} />
      <AssignQuizDialog
        open={!!target}
        quiz={target}
        onOpenChange={(o) => { if (!o) { setAssigning(null); setPendingId(null); } }}
      />
      <PreviewDialog quiz={previewing} onClose={() => setPreviewing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete quiz?"
        description={deleting?.title}
        confirmLabel={del.isPending ? "Deleting…" : "Delete"}
        onConfirm={() => { if (deleting) del.mutate(deleting.id); }}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
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

function Section({
  title, items, onAssign, onPreview, onDelete,
}: {
  title: string; items: AiQuiz[];
  onAssign: (q: AiQuiz) => void; onPreview: (q: AiQuiz) => void; onDelete: (q: AiQuiz) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        {title} <span className="text-muted-foreground font-normal">({items.length})</span>
      </h2>
      <div className="grid gap-3">
        {items.map((q) => (
          <Card key={q.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="font-medium truncate">{q.title}</p>
              <p className="text-xs text-muted-foreground">
                {q.subject_label || "—"} · {q.difficulty} · {q.question_count} questions
                {` · ${q.time_limit_minutes ? `${q.time_limit_minutes} min timer` : "No timer"}`}
                {q.due_at ? ` · Due ${new Date(q.due_at).toLocaleString()}` : ""}
              </p>

            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{q.status}</Badge>
              <Button size="sm" variant="outline" onClick={() => onPreview(q)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssign(q)}>
                <Send className="h-4 w-4 mr-1" /> Assign
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/faculty/quizzes/$id" params={{ id: q.id }}>
                  <ListChecks className="h-4 w-4 mr-1" /> Attempts
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(q)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type Q =
  | { type: "mcq"; question: string; options: string[]; answer_index: number; explanation?: string }
  | { type: "true_false"; question: string; answer: boolean; explanation?: string }
  | { type: "short"; question: string; answer: string }
  | { type: "long"; question: string; answer: string };

function PreviewDialog({ quiz, onClose }: { quiz: AiQuiz | null; onClose: () => void }) {
  if (!quiz) return null;
  const qs = (quiz.questions as Q[] | undefined) ?? [];
  return (
    <Dialog open={!!quiz} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{quiz.title}</DialogTitle></DialogHeader>
        <ol className="space-y-4 list-decimal pl-5">
          {qs.map((q, i) => (
            <li key={i} className="space-y-1">
              <p className="font-medium">{q.question}</p>
              {q.type === "mcq" && (
                <ul className="pl-4 space-y-0.5 text-sm">
                  {q.options.map((o, j) => (
                    <li key={j} className={j === q.answer_index ? "text-primary font-semibold" : ""}>
                      {String.fromCharCode(65 + j)}. {o}
                    </li>
                  ))}
                </ul>
              )}
              {q.type === "true_false" && <p className="text-sm text-primary">Answer: {q.answer ? "True" : "False"}</p>}
              {(q.type === "short" || q.type === "long") && (
                <p className="text-sm text-muted-foreground">Model answer: {q.answer}</p>
              )}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
