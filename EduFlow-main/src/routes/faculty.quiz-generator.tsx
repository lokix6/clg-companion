import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, PencilLine, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { aiGenerateQuiz } from "@/lib/ai.functions";
import { aiKeys, quizzesQuery, type AiQuiz } from "@/features/ai/queries";
import { AssignQuizDialog } from "@/features/quiz/AssignQuizDialog";
import { ManualQuizDialog } from "@/features/quiz/ManualQuizDialog";

export const Route = createFileRoute("/faculty/quiz-generator")({
  head: () => ({
    meta: [
      { title: "AI Quiz Generator — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type QuestionType = "mcq" | "true_false" | "short" | "long";
type Q =
  | { type: "mcq"; question: string; options: string[]; answer_index: number; explanation?: string }
  | { type: "true_false"; question: string; answer: boolean; explanation?: string }
  | { type: "short"; question: string; answer: string }
  | { type: "long"; question: string; answer: string };

function Page() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState("20");
  const [types, setTypes] = useState<QuestionType[]>(["mcq"]);
  const [assigning, setAssigning] = useState<AiQuiz | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [pendingAssignId, setPendingAssignId] = useState<string | null>(null);

  const fn = useServerFn(aiGenerateQuiz);
  const list = useQuery(quizzesQuery());

  const gen = useMutation({
    mutationFn: () =>
      fn({
        data: {
          title: title || `${subject || "Quiz"} — ${topic || "General"}`,
          subjectLabel: subject || undefined,
          topic: topic || undefined,
          difficulty,
          questionCount: count,
          types,
          timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        },
      }),
    onSuccess: async () => {
      toast.success("Quiz generated and saved");
      await qc.invalidateQueries({ queryKey: aiKeys.quizzes() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleType = (t: QuestionType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const latest = list.data?.[0];
  const assignTarget =
    assigning ?? (pendingAssignId ? list.data?.find((q) => q.id === pendingAssignId) ?? null : null);
  const questions = (latest?.questions as Q[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Quiz Generator"
        description="Generate a quiz, preview it, then assign it to students."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setManualOpen(true)}>
              <PencilLine className="h-4 w-4 mr-2" /> Assign the Quiz Manually
            </Button>
            <Button variant="outline" asChild>
              <Link to="/faculty/quizzes">Manage quizzes →</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border bg-card p-5 space-y-3 h-fit">
          <Input placeholder="Quiz title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Subject (e.g. Operating Systems)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input placeholder="Topic (e.g. Process Scheduling)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div>
            <label className="text-sm font-medium">Difficulty</label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Question count</label>
            <Input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value) || 10)} />
          </div>
          <div>
            <label className="text-sm font-medium">Timer (minutes)</label>
            <Input
              type="number"
              min={1}
              max={600}
              placeholder="No time limit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Students see a countdown; the quiz auto-submits at zero. Leave blank for no limit.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Question types</label>
            {(["mcq", "true_false", "short", "long"] as QuestionType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <Checkbox checked={types.includes(t)} onCheckedChange={() => toggleType(t)} />
                <span>
                  {t === "mcq" ? "Multiple choice" : t === "true_false" ? "True / False" : t === "short" ? "Short answer" : "Long answer"}
                </span>
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={() => gen.mutate()} disabled={gen.isPending || types.length === 0}>
            {gen.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Quiz</>
            )}
          </Button>
          <div className="pt-1 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => setManualOpen(true)}
            >
              Prefer your own questions? Assign the Quiz Manually
            </button>
          </div>
        </div>


        <div className="rounded-xl border bg-card p-5 min-h-[400px]">
          {!latest && (
            <div className="text-sm text-muted-foreground text-center py-16">
              Your generated quiz will appear here and be saved for students.
            </div>
          )}
          {latest && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{latest.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {latest.difficulty} · {latest.question_count} questions · <span className="capitalize">{latest.status}</span>
                  </p>
                </div>
                <Button size="sm" onClick={() => setAssigning(latest)}>
                  <Send className="h-4 w-4 mr-1" /> Assign to students
                </Button>
              </div>
              <ol className="space-y-4 list-decimal pl-5">
                {questions.map((q, i) => (
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
                    {q.type === "true_false" && (
                      <p className="text-sm text-primary">Answer: {q.answer ? "True" : "False"}</p>
                    )}
                    {(q.type === "short" || q.type === "long") && (
                      <p className="text-sm text-muted-foreground">Model answer: {q.answer}</p>
                    )}
                    {"explanation" in q && q.explanation && (
                      <p className="text-xs text-muted-foreground italic">{q.explanation}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
      <ManualQuizDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onCreated={(id) => setPendingAssignId(id)}
      />
      <AssignQuizDialog
        open={!!assignTarget}
        quiz={assignTarget}
        onOpenChange={(o) => {
          if (!o) { setAssigning(null); setPendingAssignId(null); }
        }}
      />
    </div>
  );
}
