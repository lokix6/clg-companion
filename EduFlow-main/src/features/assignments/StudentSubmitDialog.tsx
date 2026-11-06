import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Paperclip, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { assignmentKeys } from "./queries";
import type { StudentAssignmentRow } from "./types";
import {
  ASSIGNMENT_ATTACHMENTS_BUCKET,
  ASSIGNMENT_SUBMISSIONS_BUCKET,
  openStorageFile,
  uploadStudentSubmission,
} from "./storage";

export function StudentSubmitDialog({
  open,
  onOpenChange,
  assignment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: StudentAssignmentRow | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setComment(assignment?.student_comment ?? "");
    }
  }, [open, assignment]);

  const dueDate = assignment ? new Date(assignment.due_date) : null;
  const isPastDue = !!dueDate && dueDate.getTime() < Date.now();
  const graded =
    !!assignment?.review_status &&
    assignment.review_status !== "Pending" &&
    assignment.review_status !== "Returned";
  const canSubmit =
    !!assignment &&
    !graded &&
    assignment.publish_status === "Published" &&
    (!isPastDue || assignment.allow_late_submission);

  const submit = useMutation({
    mutationFn: async () => {
      if (!assignment || !user) throw new Error("Not signed in");
      if (!file && !assignment.submission_id) throw new Error("Please choose a file");
      let filePath = assignment.file_url;
      let fileName = assignment.file_name;
      if (file) {
        setUploading(true);
        try {
          const up = await uploadStudentSubmission(assignment.id, user.id, file);
          filePath = up.path;
          fileName = up.name;
        } finally {
          setUploading(false);
        }
      }
      const { error } = await supabase.rpc("student_submit_assignment" as never, {
        _assignment_id: assignment.id,
        _file_url: filePath,
        _file_name: fileName,
        _comment: comment || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission saved");
      qc.invalidateQueries({ queryKey: assignmentKeys.studentList() });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Submission failed"),
  });

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
          <DialogDescription>
            {assignment.subject_name} · Due {new Date(assignment.due_date).toLocaleString()}
            {assignment.max_marks != null ? ` · ${assignment.max_marks} marks` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {assignment.description && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Description
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}
          {assignment.instructions && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Instructions
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{assignment.instructions}</p>
            </div>
          )}
          {assignment.attachment_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!assignment.attachment_url) return;
                void openStorageFile(ASSIGNMENT_ATTACHMENTS_BUCKET, assignment.attachment_url).catch(
                  (error: unknown) => toast.error((error as Error).message || "Could not open attachment"),
                );
              }}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {assignment.attachment_name || "Download attachment"}
            </Button>
          )}

          {(graded || assignment.review_status === "Returned") && (
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
               <div className="text-sm font-semibold">
                 {assignment.review_status === "Returned" ? "Revision requested" : "Result"}
               </div>
                <Badge variant={assignment.review_status === "Reviewed" ? "default" : "destructive"}>
                  {assignment.review_status}
                </Badge>
              </div>
              {assignment.review_status !== "Returned" && (
                <div className="mt-2 text-2xl font-bold">
                  {assignment.marks ?? "—"}
                  {assignment.max_marks != null && (
                    <span className="text-base font-normal text-muted-foreground"> / {assignment.max_marks}</span>
                  )}
                </div>
              )}
              {assignment.feedback && (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {assignment.feedback}
                </p>
              )}
            </div>
          )}

          {assignment.submission_id && assignment.file_url && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                 <Button
                   type="button"
                   variant="link"
                   className="h-auto p-0"
                   onClick={() => {
                     if (!assignment.file_url) return;
                     void openStorageFile(ASSIGNMENT_SUBMISSIONS_BUCKET, assignment.file_url).catch(
                       (error: unknown) => toast.error((error as Error).message || "Could not open submission"),
                     );
                   }}
                 >
                  {assignment.file_name || "Your submission"}
                 </Button>
                <Download className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Submitted {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : "—"}
              </div>
            </div>
          )}

          {canSubmit ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="text-sm font-medium">
                {assignment.submission_id ? "Replace submission" : "Submit assignment"}
              </div>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Textarea
                rows={3}
                placeholder="Optional comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {isPastDue && (
                <p className="text-xs text-amber-600">
                  Past due date — late submission allowed.
                </p>
              )}
            </div>
          ) : !graded ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {assignment.publish_status !== "Published"
                ? "Not open for submissions."
                : "Due date has passed and late submissions are not allowed."}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {canSubmit && (
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || uploading}
              className="bg-gradient-primary shadow-elegant hover:opacity-95"
            >
              <Upload className="mr-2 h-4 w-4" />
              {submit.isPending || uploading
                ? "Saving..."
                : assignment.submission_id
                ? "Replace"
                : "Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
