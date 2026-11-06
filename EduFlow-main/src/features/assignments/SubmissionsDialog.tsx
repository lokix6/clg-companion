import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { assignmentKeys, facultySubmissionsQuery } from "./queries";
import type { FacultyAssignmentRow, FacultySubmissionRow, ReviewStatus } from "./types";
import { ASSIGNMENT_SUBMISSIONS_BUCKET, openStorageFile } from "./storage";

export function SubmissionsDialog({
  open,
  onOpenChange,
  assignment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: FacultyAssignmentRow | null;
}) {
  const qc = useQueryClient();
  const submissionsQ = useQuery(facultySubmissionsQuery(open ? assignment?.id ?? null : null));
  const [selected, setSelected] = useState<FacultySubmissionRow | null>(null);
  const [marks, setMarks] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("Reviewed");

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  useEffect(() => {
    if (selected) {
      setMarks(selected.marks != null ? String(selected.marks) : "");
      setFeedback(selected.feedback ?? "");
      setStatus(selected.review_status === "Pending" ? "Reviewed" : selected.review_status);
    }
  }, [selected]);

  const grade = useMutation({
    mutationFn: async () => {
      if (!selected || !assignment) return;
      const n = marks.trim() === "" ? null : Number(marks);
      if (n != null && Number.isNaN(n)) throw new Error("Marks must be a number");
      if (n != null && assignment.max_marks != null && n > assignment.max_marks) {
        throw new Error(`Marks cannot exceed ${assignment.max_marks}`);
      }
      const { error } = await supabase.rpc("faculty_grade_submission" as never, {
        _submission_id: selected.id,
        _marks: n,
        _feedback: feedback || null,
        _status: status,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission graded");
      if (assignment) {
        qc.invalidateQueries({ queryKey: assignmentKeys.facultySubmissions(assignment.id) });
        qc.invalidateQueries({ queryKey: assignmentKeys.facultyList() });
        qc.invalidateQueries({ queryKey: assignmentKeys.facultyDashboard() });
      }
      setSelected(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Failed to save"),
  });

  const stats = useMemo(() => {
    const rows = submissionsQ.data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.review_status === "Pending").length,
      reviewed: rows.filter((r) => r.review_status === "Reviewed").length,
      returned: rows.filter((r) => r.review_status === "Returned").length,
      late: rows.filter((r) => r.is_late).length,
    };
  }, [submissionsQ.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submissions — {assignment?.title}</DialogTitle>
          <DialogDescription>
            {assignment?.subject_name} · {stats.total} submissions · {stats.pending} pending
            {stats.late > 0 ? ` · ${stats.late} late` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-border">
            {submissionsQ.isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : submissionsQ.isError ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-destructive">Couldn’t load submissions.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(submissionsQ.error as Error)?.message || "Unknown error"}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => submissionsQ.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (submissionsQ.data ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No submissions yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(submissionsQ.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted ${
                      selected?.id === s.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {s.student_name || s.student_email || "Student"}
                        </span>
                        {s.roll_number && (
                          <span className="text-xs text-muted-foreground">{s.roll_number}</span>
                        )}
                        {s.is_late && (
                          <Badge variant="destructive" className="text-[10px]">Late</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(s.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant={
                        s.review_status === "Reviewed"
                          ? "default"
                          : s.review_status === "Returned"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {s.review_status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border p-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a submission to grade.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold">{selected.student_name}</div>
                  <div className="text-xs text-muted-foreground">{selected.student_email}</div>
                </div>
                {selected.file_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!selected.file_url) return;
                      void openStorageFile(ASSIGNMENT_SUBMISSIONS_BUCKET, selected.file_url).catch(
                        (error: unknown) => toast.error((error as Error).message || "Could not open submission"),
                      );
                    }}
                    className="w-full justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {selected.file_name || "Download submission"}
                    <Download className="ml-auto h-4 w-4" />
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">No file attached.</p>
                )}
                {selected.student_comment && (
                  <div className="rounded-md bg-muted p-2 text-xs">
                    <span className="font-medium">Comment: </span>
                    {selected.student_comment}
                  </div>
                )}
                <div className="grid gap-2">
                  <label className="text-xs font-medium">
                    Marks {assignment?.max_marks != null ? `(max ${assignment.max_marks})` : ""}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={assignment?.max_marks ?? undefined}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Feedback</label>
                  <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Reviewed">Reviewed</SelectItem>
                      <SelectItem value="Returned">Returned (needs rework)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => grade.mutate()}
                  disabled={grade.isPending}
                  className="w-full bg-gradient-primary shadow-elegant hover:opacity-95"
                >
                  {grade.isPending ? "Saving…" : "Save grade"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
