import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { runPracticeQuery, resetDataset } from "./engine";
import { evaluateResult } from "./evaluate";
import { useLabAttempts, useLabDataset, useLabQuestions, useRecordLabAttempt } from "./queries";
import { DifficultyBadge, QuestionList } from "./QuestionList";
import { ResultsTable } from "./ResultsTable";
import { SqlEditor } from "./SqlEditor";
import type { LabQuestion, QueryResult } from "./types";

const STARTER = "-- Write your SQL query here\nSELECT ";

interface TableSchema {
  name: string;
  columns: string[];
}

function parseSchema(setupSql: string): TableSchema[] {
  const tables: TableSchema[] = [];
  const re = /CREATE TABLE (\w+) \(([^;]+?)\);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(setupSql))) {
    const columns = m[2]
      .split(",")
      .map((part) => part.trim().split(/\s+/).slice(0, 2).join(" "))
      .filter(Boolean);
    tables.push({ name: m[1], columns });
  }
  return tables;
}

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "incorrect"; message: string }
  | { kind: "error"; message: string };

export function QuestionWorkspace() {
  const { data: questions, isLoading, isError } = useLabQuestions();
  const { data: attempts = [] } = useLabAttempts();
  const recordAttempt = useRecordLabAttempt();

  const [selected, setSelected] = useState<LabQuestion | null>(null);
  const [sqlByQuestion, setSqlByQuestion] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QueryResult | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [running, setRunning] = useState(false);

  const { data: dataset } = useLabDataset(selected?.dataset_key);
  const schema = useMemo(() => (dataset ? parseSchema(dataset.setup_sql) : []), [dataset]);

  useEffect(() => {
    if (!selected && questions && questions.length > 0) setSelected(questions[0]);
  }, [questions, selected]);

  const sql = selected ? (sqlByQuestion[selected.id] ?? attemptSql(selected.id) ?? STARTER) : "";

  function attemptSql(questionId: string) {
    return attempts.find((a) => a.question_id === questionId)?.last_sql ?? null;
  }

  const selectQuestion = (q: LabQuestion) => {
    setSelected(q);
    setResult(null);
    setFeedback(null);
    setShowHint(false);
  };

  const setSql = (value: string) => {
    if (!selected) return;
    setSqlByQuestion((prev) => ({ ...prev, [selected.id]: value }));
  };

  const execute = async (mode: "run" | "submit") => {
    if (!selected || !dataset) return;
    setRunning(true);
    setFeedback(null);
    try {
      const outcome = await runPracticeQuery(dataset.key, dataset.setup_sql, sql);
      if (!outcome.ok) {
        setResult(null);
        setFeedback({ kind: "error", message: outcome.error });
        return;
      }
      setResult(outcome.result);
      if (mode === "run") {
        setFeedback(null);
        return;
      }
      const evaluation = evaluateResult(outcome.result, selected.expected_output, selected.expected_ordered);
      if (evaluation.correct) {
        setFeedback({ kind: "success", message: evaluation.message });
        toast.success("Correct! Question marked as solved.");
      } else {
        setFeedback({ kind: "incorrect", message: evaluation.message });
      }
      recordAttempt.mutate({ questionId: selected.id, sql, solved: evaluation.correct });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    if (!selected || !dataset) return;
    setSql(STARTER);
    setResult(null);
    setFeedback(null);
    setShowHint(false);
    setRunning(true);
    try {
      await resetDataset(dataset.key, dataset.setup_sql);
      toast.success("Editor and practice data reset.");
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading SQL Lab…
      </div>
    );
  }

  if (isError || !questions || questions.length === 0) {
    return (
      <EmptyState
        title="SQL Lab is unavailable"
        description="The question bank could not be loaded. Please try again in a moment."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <InfoCard className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Questions</h2>
          <span className="text-xs text-muted-foreground">
            {attempts.filter((a) => a.status === "solved").length}/{questions.length} solved
          </span>
        </div>
        <QuestionList
          questions={questions}
          attempts={attempts}
          selectedId={selected?.id ?? null}
          onSelect={selectQuestion}
        />
      </InfoCard>

      {selected && (
        <div className="min-w-0 space-y-4">
          <InfoCard>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Question {selected.question_number}
              </span>
              <DifficultyBadge difficulty={selected.difficulty} />
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {selected.topic}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold">{selected.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.statement}</p>

            {schema.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Table2 className="h-3.5 w-3.5" /> Sample tables — {dataset?.name}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {schema.map((t) => (
                    <div key={t.name} className="rounded-lg border border-border bg-card p-2.5">
                      <div className="font-mono text-xs font-bold text-primary">{t.name}</div>
                      <ul className="mt-1 space-y-0.5">
                        {t.columns.map((c) => (
                          <li key={c} className="font-mono text-[11px] text-muted-foreground">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </InfoCard>

          <InfoCard>
            <SqlEditor value={sql} onChange={setSql} disabled={running} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => execute("run")} disabled={running || !dataset}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Query
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => execute("submit")}
                disabled={running || !dataset}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" /> Submit Answer
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} disabled={running}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              {selected.hint && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHint((v) => !v)}
                  disabled={running}
                >
                  <Lightbulb className="h-4 w-4" /> {showHint ? "Hide Hint" : "View Hint"}
                </Button>
              )}
            </div>

            {showHint && selected.hint && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                {selected.hint}
              </div>
            )}

            {feedback && (
              <div
                className={
                  feedback.kind === "success"
                    ? "mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                    : feedback.kind === "incorrect"
                      ? "mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
                      : "mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"
                }
                role={feedback.kind === "error" ? "alert" : "status"}
              >
                {feedback.kind === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span className="break-words">{feedback.message}</span>
              </div>
            )}
          </InfoCard>

          {result && (
            <InfoCard>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Results</h3>
                <span className="text-xs text-muted-foreground">
                  {result.rows.length} row{result.rows.length === 1 ? "" : "s"} · {result.durationMs} ms
                </span>
              </div>
              <ResultsTable result={result} />
            </InfoCard>
          )}
        </div>
      )}
    </div>
  );
}
