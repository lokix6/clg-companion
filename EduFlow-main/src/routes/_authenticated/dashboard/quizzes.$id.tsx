import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import { aiKeys, studentQuizDetailQuery, myQuizAttemptsQuery, type StudentQuizDetail } from "@/features/ai/queries";
import { startQuizAttempt, submitQuizAttempt } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/dashboard/quizzes/$id")({
  head: () => ({
    meta: [
      { title: "Take Quiz — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Q =
  | { type: "mcq"; question: string; options: string[]; answer_index?: number; explanation?: string }
  | { type: "true_false"; question: string; answer?: boolean; explanation?: string }
  | { type: "short"; question: string; answer?: string }
  | { type: "long"; question: string; answer?: string };

type StoredAnswer = { type: string; value: unknown };

function storageKey(quizId: string, userId: string) {
  return `eduflow_quiz_${quizId}_${userId}`;
}

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const quizQ = useQuery(studentQuizDetailQuery(id));
  const myAttemptsQ = useQuery(myQuizAttemptsQuery(user?.id ?? "", id));

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<StoredAnswer[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const startFn = useServerFn(startQuizAttempt);
  const submitFn = useServerFn(submitQuizAttempt);

  const quiz = quizQ.data as StudentQuizDetail | null | undefined;
  const questions = (quiz?.questions as Q[] | undefined) ?? [];

  // Load saved progress
  useEffect(() => {
    if (!quiz || !user) return;
    const raw = localStorage.getItem(storageKey(id, user.id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { answers: StoredAnswer[]; startedAt: string };
        setAnswers(parsed.answers);
        setStartedAt(parsed.startedAt);
        setStarted(true);
      } catch { /* ignore */ }
    }
  }, [quiz, user, id]);

  // Auto-save
  useEffect(() => {
    if (!started || !user) return;
    localStorage.setItem(storageKey(id, user.id), JSON.stringify({ answers, startedAt }));
  }, [answers, startedAt, started, user, id]);

  // Timer tick
  useEffect(() => {
    if (!started || !quiz?.time_limit_minutes) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [started, quiz?.time_limit_minutes]);

  const timeLeftSec = useMemo(() => {
    if (!started || !quiz?.time_limit_minutes || !startedAt) return null;
    const endMs = new Date(startedAt).getTime() + quiz.time_limit_minutes * 60_000;
    return Math.max(0, Math.floor((endMs - now) / 1000));
  }, [started, quiz?.time_limit_minutes, startedAt, now]);

  const submitting = useRef(false);
  const submit = useMutation({
    mutationFn: async () => {
      if (submitting.current) return;
      const unanswered = questions.some((q, index) => {
        const value = answers[index]?.value;
        return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
      });
      if (unanswered) throw new Error("Please answer every question before submitting.");
      submitting.current = true;
      return submitFn({ data: { quizId: id, answers, started_at: startedAt ?? undefined } });
    },
    onSuccess: (res) => {
      if (!user || !res) return;
      localStorage.removeItem(storageKey(id, user.id));
      toast.success(
        res.needsReview
          ? `Submitted. Auto-graded: ${res.autoScore}/${res.autoGradable}. Awaiting faculty review.`
          : `Submitted. Score: ${res.autoScore}/${res.total}`,
      );
      qc.invalidateQueries({ queryKey: aiKeys.myQuizAttempts(user.id) });
      qc.invalidateQueries({ queryKey: aiKeys.studentQuizzes() });
      navigate({ to: "/dashboard/quizzes" });
    },
    onError: (e: Error) => { submitting.current = false; toast.error(e.message); },
  });

  useEffect(() => {
    if (timeLeftSec === 0 && started && !submit.isPending) submit.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec]);

  const start = useMutation({
    mutationFn: () => startFn({ data: { quizId: id } }),
    onSuccess: (res) => {
      const safeQuestions = (res.questions as Q[] | undefined) ?? questions;
      const initial = safeQuestions.map((q) => ({ type: q.type, value: null }));
      setAnswers(initial);
      setStartedAt(new Date().toISOString());
      setStarted(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previousAttempts = myAttemptsQ.data ?? [];

  if (quizQ.isError) {
    return (
      <Card className="p-6 space-y-3">
        <p className="font-medium">This quiz could not be opened.</p>
        <p className="text-sm text-muted-foreground">{quizQ.error.message}</p>
        <Button variant="outline" asChild><Link to="/dashboard/quizzes">Back to quizzes</Link></Button>
      </Card>
    );
  }

  if (quizQ.isLoading || !quiz) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/dashboard/quizzes"><ArrowLeft className="h-4 w-4 mr-1" /> All quizzes</Link>
        </Button>
        <PageHeader
          title={quiz.title}
          description={`${quiz.difficulty} · ${quiz.question_count} questions${quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}`}
          actions={
            timeLeftSec !== null ? (
              <Badge variant={timeLeftSec < 60 ? "destructive" : "secondary"} className="text-base px-3 py-1">
                <Clock className="h-4 w-4 mr-1" /> {Math.floor(timeLeftSec / 60)}:{String(timeLeftSec % 60).padStart(2, "0")}
              </Badge>
            ) : null
          }
        />
      </div>

      {!started ? (
        <Card className="p-6 space-y-4">
          <p className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {quiz.time_limit_minutes
              ? <>Time limit: <span className="font-medium">{quiz.time_limit_minutes} minutes</span> — the timer starts as soon as you press Start and auto-submits at zero.</>
              : "No time limit for this quiz."}
          </p>
          <p className="text-sm text-muted-foreground">
            Attempts used: {previousAttempts.length} / {quiz.attempts_allowed}
          </p>

          {previousAttempts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Previous attempts</p>
              {previousAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border rounded p-2">
                  <span>Attempt #{a.attempt_no} · {new Date(a.submitted_at).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{a.status}</Badge>
                    {a.score != null ? `${a.score}/${a.total}` : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => start.mutate()} disabled={start.isPending || previousAttempts.length >= quiz.attempts_allowed}>
            {start.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Start quiz
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {timeLeftSec !== null && quiz.time_limit_minutes ? (
            <div className="sticky top-2 z-30">
              <Card
                className={`p-3 flex items-center justify-between gap-3 border-2 shadow-sm backdrop-blur bg-card/95 ${
                  timeLeftSec <= 60 ? "border-destructive" : "border-border"
                }`}
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className={`h-4 w-4 ${timeLeftSec <= 60 ? "text-destructive" : ""}`} />
                  Time remaining
                </span>
                <span
                  className={`font-mono text-xl font-semibold tabular-nums ${
                    timeLeftSec <= 60 ? "text-destructive animate-pulse" : ""
                  }`}
                >
                  {String(Math.floor(timeLeftSec / 60)).padStart(2, "0")}:
                  {String(timeLeftSec % 60).padStart(2, "0")}
                </span>
              </Card>
              <div className="h-1 rounded-b bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${timeLeftSec <= 60 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (timeLeftSec / (quiz.time_limit_minutes * 60)) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No time limit set for this quiz.</p>
          )}

          {questions.map((q, i) => (
            <Card key={i} className="p-4 space-y-3">
              <p className="font-medium">{i + 1}. {q.question}</p>
              <QuestionInput
                q={q}
                index={i}
                value={answers[i]?.value}
                onChange={(v) => setAnswers((prev) => {
                  const next = [...prev];
                  next[i] = { type: q.type, value: v };
                  return next;
                })}
              />
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit quiz
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Progress is saved automatically in this browser.
          </p>
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  q, index, value, onChange,
}: { q: Q; index: number; value: unknown; onChange: (v: unknown) => void }) {
  if (q.type === "mcq") {
    return (
      <div className="space-y-2">
        {q.options.map((o, j) => (
          <label key={j} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`question-${index}`}
              value={j}
              checked={value === j}
              onChange={() => onChange(j)}
            />
            <span>{String.fromCharCode(65 + j)}. {o}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "true_false") {
    return (
      <div className="flex gap-4">
        {[true, false].map((b) => (
          <label key={String(b)} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`question-${index}`}
              checked={value === b}
              onChange={() => onChange(b)}
            />
            <span>{b ? "True" : "False"}</span>
          </label>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Your answer</Label>
      <Textarea
        rows={q.type === "long" ? 6 : 3}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
