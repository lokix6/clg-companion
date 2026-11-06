import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { assignmentKeys } from "./queries";
import type { FacultyAssignmentRow, FacultyCatalogSubject, PublishStatus } from "./types";
import {
  ASSIGNMENT_ATTACHMENTS_BUCKET,
  openStorageFile,
  uploadFacultyAttachment,
} from "./storage";

const schema = z.object({
  catalog_subject_id: z.string().uuid("Subject required"),
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  instructions: z.string().max(6000).optional().or(z.literal("")),
  due_date: z.string().min(1, "Due date required"),
  max_marks: z.coerce.number().int().min(0).max(1000).optional().or(z.nan().transform(() => undefined)),
  allow_late_submission: z.boolean(),
  publish_status: z.enum(["Draft", "Published", "Closed"]),
});
type Values = z.infer<typeof schema>;

function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  subjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment?: FacultyAssignmentRow | null;
  subjects: FacultyCatalogSubject[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!assignment;

  const [file, setFile] = useState<File | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      catalog_subject_id: "",
      title: "",
      description: "",
      instructions: "",
      due_date: "",
      max_marks: undefined,
      allow_late_submission: false,
      publish_status: "Draft",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      catalog_subject_id: assignment?.catalog_subject_id ?? "",
      title: assignment?.title ?? "",
      description: assignment?.description ?? "",
      instructions: assignment?.instructions ?? "",
      due_date: assignment?.due_date ? toLocalDateTimeValue(assignment.due_date) : "",
      max_marks: assignment?.max_marks ?? undefined,
      allow_late_submission: assignment?.allow_late_submission ?? false,
      publish_status: (assignment?.publish_status as PublishStatus) ?? "Draft",
    });
    setAttachmentPath(assignment?.attachment_url ?? null);
    setAttachmentName(assignment?.attachment_name ?? null);
    setFile(null);
  }, [open, assignment, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const subj = subjects.find((s) => s.id === v.catalog_subject_id);
      if (!subj) throw new Error("Subject not found");

      let attUrl = attachmentPath;
      let attName = attachmentName;
      if (file) {
        setUploading(true);
        try {
          const up = await uploadFacultyAttachment(user.id, file);
          attUrl = up.path;
          attName = up.name;
        } finally {
          setUploading(false);
        }
      }

      const payload = {
        student_id: null,
        subject_id: subj.id,
        catalog_subject_id: subj.id,
        subject_code: subj.subject_code,
        department_id: subj.department_id,
        semester: subj.semester,
        faculty_id: user.id,
        created_by: user.id,
        is_shared: true,
        title: v.title.trim(),
        description: v.description?.trim() || null,
        instructions: v.instructions?.trim() || null,
        due_date: new Date(v.due_date).toISOString(),
        priority: "Medium" as const,
        status: "Pending" as const,
        max_marks: v.max_marks ?? null,
        allow_late_submission: v.allow_late_submission,
        publish_status: v.publish_status,
        attachment_url: attUrl,
        attachment_name: attName,
      };

      if (isEdit && assignment) {
        const { data, error } = await supabase
          .from("assignments")
          .update(payload)
          .eq("id", assignment.id)
          .select("id")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Assignment could not be updated");
      } else {
        const { data, error } = await supabase.from("assignments").insert(payload).select("id").single();
        if (error) throw error;
        if (!data) throw new Error("Assignment could not be created");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assignmentKeys.facultyList() });
      qc.invalidateQueries({ queryKey: assignmentKeys.facultyDashboard() });
      toast.success(isEdit ? "Assignment updated" : "Assignment created");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment" : "New assignment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="catalog_subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject_name}
                          {s.subject_code ? ` (${s.subject_code})` : ""}
                          {s.semester ? ` — Sem ${s.semester}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Detailed instructions for students" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date *</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum marks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={1000}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="publish_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft (hidden)</SelectItem>
                        <SelectItem value="Published">Published (visible to students)</SelectItem>
                        <SelectItem value="Closed">Closed (no new submissions)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allow_late_submission"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <FormLabel className="text-sm">Allow late submission</FormLabel>
                      <p className="text-xs text-muted-foreground">Students can submit after due date.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-attachment">Attachment (PDF, DOCX, ZIP)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="assignment-attachment"
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {attachmentPath && !file && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        void openStorageFile(ASSIGNMENT_ATTACHMENTS_BUCKET, attachmentPath).catch(
                          (error: unknown) => toast.error((error as Error).message || "Could not open attachment"),
                        );
                      }}
                    >
                      {attachmentName || "Attachment"}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAttachmentPath(null);
                        setAttachmentName(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending || uploading}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending || uploading ? "Saving..." : isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
