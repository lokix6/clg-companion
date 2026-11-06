import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assignQuiz } from "@/lib/quiz.functions";
import { aiKeys, type AiQuiz } from "@/features/ai/queries";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string; department_id?: string | null };

export function AssignQuizDialog({
  open,
  quiz,
  onOpenChange,
}: {
  open: boolean;
  quiz: AiQuiz | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(assignQuiz);

  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [semester, setSemester] = useState<string>("");
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [attempts, setAttempts] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [randomize, setRandomize] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);

  useEffect(() => {
    if (!quiz) return;
    setDepartmentId(quiz.department_id);
    setSemester(quiz.semester ? String(quiz.semester) : "");
    setSectionId(quiz.section_id);
    setPublishAt(quiz.publish_at ? quiz.publish_at.slice(0, 16) : "");
    setDueAt(quiz.due_at ? quiz.due_at.slice(0, 16) : "");
    setTimeLimit(quiz.time_limit_minutes ? String(quiz.time_limit_minutes) : "");
    setAttempts(quiz.attempts_allowed ?? 1);
    setShuffle(!!quiz.shuffle_questions);
    setRandomize(!!quiz.randomize_options);
    setShowAnswers(quiz.show_correct_answers ?? true);
  }, [quiz]);

  const departments = useQuery({
    queryKey: ["quiz-assign", "departments"],
    queryFn: async (): Promise<Option[]> => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return (data ?? []) as Option[];
    },
    enabled: open,
  });

  const sections = useQuery({
    queryKey: ["quiz-assign", "sections", departmentId],
    queryFn: async (): Promise<Option[]> => {
      let q = supabase.from("sections").select("id, name, department_id");
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data } = await q.order("name");
      return (data ?? []) as Option[];
    },
    enabled: open,
  });

  const mutate = useMutation({
    mutationFn: (status: "draft" | "assigned") =>
      fn({
        data: {
          quizId: quiz!.id,
          catalog_subject_id: null,
          department_id: departmentId,
          semester: semester ? Number(semester) : null,
          section_id: sectionId,
          publish_at: publishAt ? new Date(publishAt).toISOString() : null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          time_limit_minutes: timeLimit ? Number(timeLimit) : null,
          attempts_allowed: attempts,
          shuffle_questions: shuffle,
          randomize_options: randomize,
          show_correct_answers: showAnswers,
          target_student_ids: [],
          status,
        },
      }),
    onSuccess: async (_, status) => {
      toast.success(status === "assigned" ? "Quiz assigned & notifications sent" : "Draft saved");
      await qc.invalidateQueries({ queryKey: aiKeys.quizzes() });
      await qc.invalidateQueries({ queryKey: aiKeys.facultyAnalytics() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign quiz</DialogTitle>
          <DialogDescription className="truncate">{quiz.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Select value={departmentId ?? "any"} onValueChange={(v) => setDepartmentId(v === "any" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any department</SelectItem>
                  {departments.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Input type="number" min={1} max={12} value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Section</Label>
            <Select value={sectionId ?? "any"} onValueChange={(v) => setSectionId(v === "any" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Any section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any section</SelectItem>
                {sections.data?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Publish at</Label>
              <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </div>
            <div>
              <Label>Due at</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Timer (minutes)</Label>
              <Input type="number" min={1} placeholder="No limit" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Shown as a countdown; auto-submits at zero.</p>
            </div>

            <div>
              <Label>Attempts allowed</Label>
              <Input type="number" min={1} max={10} value={attempts} onChange={(e) => setAttempts(Number(e.target.value) || 1)} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm">Shuffle questions</Label>
            <Switch checked={shuffle} onCheckedChange={setShuffle} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Randomize options</Label>
            <Switch checked={randomize} onCheckedChange={setRandomize} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show correct answers after submit</Label>
            <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => mutate.mutate("draft")} disabled={mutate.isPending}>
            Save draft
          </Button>
          <Button onClick={() => mutate.mutate("assigned")} disabled={mutate.isPending}>
            {mutate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Assign quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
