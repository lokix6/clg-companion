import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createManualQuiz } from "@/lib/quiz.functions";
import { aiKeys } from "@/features/ai/queries";

type QType = "mcq" | "true_false" | "short" | "long";

type Draft = {
  type: QType;
  question: string;
  options: string[];
  answer_index: number;
  answer_bool: boolean;
  answer_text: string;
  explanation: string;
};

const blank = (type: QType = "mcq"): Draft => ({
  type,
  question: "",
  options: ["", "", "", ""],
  answer_index: 0,
  answer_bool: true,
  answer_text: "",
  explanation: "",
});

export function ManualQuizDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (quizId: string) => void;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(createManualQuiz);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [timeLimit, setTimeLimit] = useState("20");
  const [items, setItems] = useState<Draft[]>([blank()]);

  const patch = (i: number, p: Partial<Draft>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...p } : it)));

  const reset = () => {
    setTitle(""); setSubject(""); setTopic(""); setDifficulty("medium");
    setTimeLimit("20"); setItems([blank()]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Enter a quiz title");
      const questions = items.map((it, idx) => {
        const q = it.question.trim();
        if (!q) throw new Error(`Question ${idx + 1} is empty`);
        if (it.type === "mcq") {
          const options = it.options.map((o) => o.trim()).filter(Boolean);
          if (options.length < 2) throw new Error(`Question ${idx + 1} needs at least 2 options`);
          if (it.answer_index >= options.length) throw new Error(`Pick the correct option for question ${idx + 1}`);
          return {
            type: "mcq" as const, question: q, options, answer_index: it.answer_index,
            ...(it.explanation.trim() ? { explanation: it.explanation.trim() } : {}),
          };
        }
        if (it.type === "true_false") {
          return {
            type: "true_false" as const, question: q, answer: it.answer_bool,
            ...(it.explanation.trim() ? { explanation: it.explanation.trim() } : {}),
          };
        }
        return { type: it.type, question: q, answer: it.answer_text.trim() };
      });
      return fn({
        data: {
          title: title.trim(),
          subject_label: subject.trim() || null,
          topic: topic.trim() || null,
          difficulty,
          time_limit_minutes: timeLimit ? Number(timeLimit) : null,
          questions,
        },
      });
    },
    onSuccess: async (res) => {
      toast.success("Quiz created — now assign it to students");
      await qc.invalidateQueries({ queryKey: aiKeys.quizzes() });
      onOpenChange(false);
      reset();
      onCreated?.(res.quizId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) save.reset(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign the Quiz Manually</DialogTitle>
          <DialogDescription>
            Write your own questions and answer key, save it, then assign it to students.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Quiz title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 2 — Process Scheduling" />
          </div>
          <div>
            <Label>Subject (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Operating Systems" />
          </div>
          <div>
            <Label>Topic (optional)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Scheduling algorithms" />
          </div>
          <div>
            <Label>Difficulty</Label>
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
            <Label>Timer (minutes)</Label>
            <Input type="number" min={1} max={600} placeholder="No limit" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Question {i + 1}</p>
                <div className="flex items-center gap-2">
                  <Select value={it.type} onValueChange={(v) => patch(i, { type: v as QType })}>
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple choice</SelectItem>
                      <SelectItem value="true_false">True / False</SelectItem>
                      <SelectItem value="short">Short answer</SelectItem>
                      <SelectItem value="long">Long answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon" variant="ghost" type="button"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder="Type the question…"
                value={it.question}
                onChange={(e) => patch(i, { question: e.target.value })}
              />

              {it.type === "mcq" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select the radio button next to the correct option.</p>
                  {it.options.map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`manual-correct-${i}`}
                        checked={it.answer_index === j}
                        onChange={() => patch(i, { answer_index: j })}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      <Input
                        value={o}
                        placeholder={`Option ${String.fromCharCode(65 + j)}`}
                        onChange={(e) =>
                          patch(i, { options: it.options.map((x, k) => (k === j ? e.target.value : x)) })
                        }
                      />
                      {it.options.length > 2 && (
                        <Button
                          size="icon" variant="ghost" type="button"
                          onClick={() =>
                            patch(i, {
                              options: it.options.filter((_, k) => k !== j),
                              answer_index: it.answer_index >= j && it.answer_index > 0 ? it.answer_index - 1 : it.answer_index,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {it.options.length < 6 && (
                    <Button size="sm" variant="outline" type="button" onClick={() => patch(i, { options: [...it.options, ""] })}>
                      <Plus className="h-4 w-4 mr-1" /> Add option
                    </Button>
                  )}
                </div>
              )}

              {it.type === "true_false" && (
                <Select value={it.answer_bool ? "true" : "false"} onValueChange={(v) => patch(i, { answer_bool: v === "true" })}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Correct answer: True</SelectItem>
                    <SelectItem value="false">Correct answer: False</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(it.type === "short" || it.type === "long") && (
                <Textarea
                  placeholder="Model answer (used by you while grading)"
                  value={it.answer_text}
                  onChange={(e) => patch(i, { answer_text: e.target.value })}
                />
              )}

              {(it.type === "mcq" || it.type === "true_false") && (
                <Input
                  placeholder="Explanation (optional)"
                  value={it.explanation}
                  onChange={(e) => patch(i, { explanation: e.target.value })}
                />
              )}
            </div>
          ))}

          <Button variant="outline" type="button" onClick={() => setItems((prev) => [...prev, blank()])}>
            <Plus className="h-4 w-4 mr-1" /> Add question
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save &amp; continue to assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
