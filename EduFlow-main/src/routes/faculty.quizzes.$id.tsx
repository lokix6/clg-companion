import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { aiKeys, quizByIdQuery, quizAttemptsQuery } from "@/features/ai/queries";
import { gradeQuizAttempt } from "@/lib/quiz.functions";

export const Route = createFileRoute("/faculty/quizzes/$id")({
  head: () => ({
    meta: [
      { title: "Quiz Attempts — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Attempt = {
  id: string;
  student_name: string | null;
  submitted_at: string;
  score: number | null;
  auto_score: number | null;
  manual_score: number | null;
  total: number | null;
  status: string;
  answers: unknown;
  feedback: string | null;
  attempt_no: number;
};

function Page() {
  const { id } = Route.useParams();
  const quizQ = useQuery(quizByIdQuery(id));
  const attemptsQ = useQuery(quizAttemptsQuery(id));
  const [grading, setGrading] = useState<Attempt | null>(null);

  const quiz = quizQ.data;
  const attempts = (attemptsQ.data ?? []) as Attempt[];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/faculty/quizzes"><ArrowLeft className="h-4 w-4 mr-1" /> All quizzes</Link>
        </Button>
        <PageHeader
          title={quiz?.title ?? "Quiz"}
          description={quiz ? `${quiz.difficulty} · ${quiz.question_count} questions · ${attempts.length} attempts` : ""}
        />
      </div>

      {attempts.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">No attempts yet.</Card>
      ) : (
        <div className="grid gap-3">
          {attempts.map((a) => {
            const pct = a.total && a.score != null ? Math.round((a.score / a.total) * 100) : null;
            return (
              <Card key={a.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.student_name ?? "Student"}</p>
                  <p className="text-xs text-muted-foreground">
                    Attempt #{a.attempt_no} · Submitted {new Date(a.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={a.status === "graded" ? "default" : "secondary"} className="capitalize">
                    {a.status}
                  </Badge>
                  <div className="text-sm">
                    {a.score != null ? `${a.score}/${a.total}${pct !== null ? ` (${pct}%)` : ""}` : "—"}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setGrading(a)}>
                    {a.status === "graded" ? "Review" : "Grade"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GradeDialog attempt={grading} quizId={id} onClose={() => setGrading(null)} />
    </div>
  );
}

function GradeDialog({
  attempt, quizId, onClose,
}: { attempt: Attempt | null; quizId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(gradeQuizAttempt);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const grade = useMutation({
    mutationFn: () =>
      fn({ data: { attemptId: attempt!.id, manual_score: Number(score), feedback: feedback || undefined } }),
    onSuccess: async () => {
      toast.success("Grade saved");
      await qc.invalidateQueries({ queryKey: aiKeys.quizAttempts(quizId) });
      await qc.invalidateQueries({ queryKey: aiKeys.facultyAnalytics() });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!attempt) return null;
  const answers = Array.isArray(attempt.answers) ? (attempt.answers as Array<Record<string, unknown>>) : [];

  return (
    <Dialog open={!!attempt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade attempt — {attempt.student_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Auto-graded: {attempt.auto_score ?? 0} / {attempt.total ?? "?"}
          </p>
          <ol className="space-y-2 list-decimal pl-5">
            {answers.map((a, i) => (
              <li key={i}>
                <div className="text-xs text-muted-foreground">Type: {String(a.type ?? "?")}</div>
                <div>Answer: <span className="font-medium">{formatValue(a.value)}</span></div>
              </li>
            ))}
          </ol>
          <div className="grid gap-2 pt-3">
            <Label>Final score (out of {attempt.total ?? 0})</Label>
            <Input
              type="number"
              min={0}
              max={attempt.total ?? undefined}
              value={score}
              placeholder={String(attempt.auto_score ?? 0)}
              onChange={(e) => setScore(e.target.value)}
            />
            <Label>Feedback</Label>
            <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => grade.mutate()} disabled={grade.isPending || !score}>
            {grade.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String.fromCharCode(65 + v);
  return String(v);
}
