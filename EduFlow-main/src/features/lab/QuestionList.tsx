import { CheckCircle2, CircleDashed, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOPIC_ORDER, type LabAttempt, type LabDifficulty, type LabQuestion } from "./types";

const difficultyStyles: Record<LabDifficulty, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function DifficultyBadge({ difficulty }: { difficulty: LabDifficulty }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        difficultyStyles[difficulty],
      )}
    >
      {difficulty}
    </span>
  );
}

export function QuestionList({
  questions,
  attempts,
  selectedId,
  onSelect,
}: {
  questions: LabQuestion[];
  attempts: LabAttempt[];
  selectedId: string | null;
  onSelect: (q: LabQuestion) => void;
}) {
  const attemptByQuestion = new Map(attempts.map((a) => [a.question_id, a]));
  const topics = TOPIC_ORDER.map((topic) => ({
    topic,
    items: questions.filter((q) => q.topic === topic),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {topics.map(({ topic, items }) => (
        <div key={topic}>
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {topic}
          </div>
          <ul className="space-y-1">
            {items.map((q) => {
              const attempt = attemptByQuestion.get(q.id);
              const active = q.id === selectedId;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(q)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    {attempt?.status === "solved" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : attempt ? (
                      <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {q.question_number}. {q.title}
                    </span>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
