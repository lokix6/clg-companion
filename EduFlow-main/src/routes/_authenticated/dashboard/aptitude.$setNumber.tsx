import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Trophy,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getSet, TOTAL_SETS } from "@/features/aptitude/data";
import { useSaveAptitudeAttempt } from "@/features/aptitude/queries";

export const Route = createFileRoute("/_authenticated/dashboard/aptitude/$setNumber")({
  component: AptitudeRunner,
});

const TIME_LIMIT_SECONDS = 20 * 60; // 20 minutes

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function AptitudeRunner() {
  const { setNumber } = Route.useParams();
  const navigate = useNavigate();
  const n = Math.max(1, Math.min(TOTAL_SETS, Number(setNumber) || 1));
  const set = useMemo(() => getSet(n), [n]);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    new Array(set.questions.length).fill(-1),
  );
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const save = useSaveAptitudeAttempt();

  // Reset when set changes.
  useEffect(() => {
    setCurrent(0);
    setAnswers(new Array(set.questions.length).fill(-1));
    setSubmitted(false);
    setElapsed(0);
    startRef.current = Date.now();
  }, [set]);

  // Tick timer
  useEffect(() => {
    if (submitted) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [submitted]);

  // Auto-submit at time limit
  useEffect(() => {
    if (!submitted && elapsed >= TIME_LIMIT_SECONDS) {
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, submitted]);

  const q = set.questions[current];
  const answeredCount = answers.filter((a) => a !== -1).length;
  const progressPct = ((current + 1) / set.questions.length) * 100;

  const handleSelect = (idx: number) => {
    if (submitted) return;
    const next = answers.slice();
    next[current] = idx;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (submitted) return;
    const score = set.questions.reduce(
      (acc, question, i) => acc + (answers[i] === question.answerIndex ? 1 : 0),
      0,
    );
    setSubmitted(true);
    try {
      await save.mutateAsync({
        set_number: set.setNumber,
        difficulty: set.difficulty,
        category: set.category,
        score,
        total: set.questions.length,
        time_taken_seconds: Math.min(elapsed, TIME_LIMIT_SECONDS),
        answers,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save attempt";
      toast.error(message);
    }
  };

  if (submitted) {
    const score = set.questions.reduce(
      (acc, question, i) => acc + (answers[i] === question.answerIndex ? 1 : 0),
      0,
    );
    const incorrect = set.questions.length - score;
    const pct = (score / set.questions.length) * 100;
    const badge =
      pct >= 85
        ? { label: "Excellent", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" }
        : pct >= 60
          ? { label: "Good", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300" }
          : { label: "Needs Practice", cls: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300" };

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Trophy className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3 text-2xl">Set {set.setNumber} Complete</CardTitle>
            <p className="text-sm text-muted-foreground">
              {set.category} · {set.difficulty.toUpperCase()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Score</div>
                <div className="mt-1 text-2xl font-bold">
                  {score}/{set.questions.length}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Correct</div>
                <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {score}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Incorrect</div>
                <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {incorrect}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Percentage</div>
                <div className="mt-1 text-2xl font-bold">{pct.toFixed(0)}%</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
              <div className="text-sm">
                <div className="text-muted-foreground">Time taken</div>
                <div className="font-semibold">{formatTime(Math.min(elapsed, TIME_LIMIT_SECONDS))}</div>
              </div>
              <Badge variant="outline" className={cn("text-sm", badge.cls)}>
                {badge.label}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Review</div>
              <ul className="space-y-2">
                {set.questions.map((question, i) => {
                  const chosen = answers[i];
                  const correct = chosen === question.answerIndex;
                  return (
                    <li key={question.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start gap-2">
                        {correct ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            Q{i + 1}. {question.question}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Your answer:{" "}
                            <span className={cn(correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                              {chosen === -1 ? "— (skipped)" : question.options[chosen]}
                            </span>
                            {!correct && (
                              <>
                                {" "}· Correct:{" "}
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {question.options[question.answerIndex]}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/dashboard/aptitude" })}
              >
                Back to Practice
              </Button>
              {set.setNumber < TOTAL_SETS && (
                <Button
                  onClick={() =>
                    navigate({
                      to: "/dashboard/aptitude/$setNumber",
                      params: { setNumber: String(set.setNumber + 1) },
                    })
                  }
                >
                  Next Set
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/dashboard/aptitude" })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Exit
          </Button>
          <div>
            <div className="text-sm font-semibold">Set {set.setNumber}</div>
            <div className="text-xs text-muted-foreground">{set.category}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="capitalize">
            {set.difficulty}
          </Badge>
          <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatTime(remaining)}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {current + 1} of {set.questions.length}
            </span>
            <span>{answeredCount} answered</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <CardTitle className="pt-2 text-base leading-relaxed sm:text-lg">
            {q.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, idx) => {
            const chosen = answers[current] === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                  chosen
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border text-xs font-semibold",
                    chosen
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={current === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          {current < set.questions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrent((c) => Math.min(set.questions.length - 1, c + 1))
              }
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={save.isPending}>
              {save.isPending ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
