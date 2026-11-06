import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ASSIGNMENT_PRIORITIES, type Assignment } from "@/features/academic/types";
import { facultyKeys, type MySubject } from "./queries";

const schema = z.object({
  subject_key: z.string().min(1, "Subject required"),
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().max(4000).optional(),
  due_date: z.string().min(1, "Due date required"),
  priority: z.string(),
  max_marks: z.coerce
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .or(z.nan().transform(() => undefined)),
  attachment_url: z.string().url().optional().or(z.literal("")),
});
type Values = z.infer<typeof schema>;

export function FacultyAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  subjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment?: Assignment | null;
  subjects: MySubject[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!assignment;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_key: "",
      title: "",
      description: "",
      due_date: "",
      priority: "Medium",
      max_marks: undefined,
      attachment_url: "",
    },
  });

  useEffect(() => {
    if (open) {
      const existing = assignment
        ? subjects.find(
            (s) =>
              s.subject_key === (assignment.subject_code ?? "") ||
              s.sample_subject_id === assignment.subject_id,
          )
        : null;
      form.reset({
        subject_key: existing?.subject_key ?? "",
        title: assignment?.title ?? "",
        description: assignment?.description ?? "",
        due_date: assignment?.due_date
          ? new Date(assignment.due_date).toISOString().slice(0, 16)
          : "",
        priority: assignment?.priority ?? "Medium",
        max_marks: (assignment as unknown as { max_marks?: number } | null)?.max_marks ?? undefined,
        attachment_url: assignment?.attachment_url ?? "",
      });
    }
  }, [open, assignment, subjects, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const subj = subjects.find((s) => s.subject_key === v.subject_key);
      if (!subj) throw new Error("Subject not found");

      const payload = {
        student_id: null,
        subject_id: subj.sample_subject_id,
        subject_code: subj.subject_key,
        created_by: user.id,
        is_shared: true,
        title: v.title.trim(),
        description: v.description?.trim() || null,
        due_date: new Date(v.due_date).toISOString(),
        priority: v.priority as "Low" | "Medium" | "High",
        status: "Pending" as const,
        max_marks: v.max_marks ?? null,
        attachment_url: v.attachment_url || null,
      };

      if (isEdit && assignment) {
        const { error } = await supabase.from("assignments").update(payload).eq("id", assignment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assignments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facultyKeys.myAssignments() });
      qc.invalidateQueries({ queryKey: facultyKeys.stats() });
      toast.success(isEdit ? "Assignment updated" : "Assignment created");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment" : "New assignment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.subject_key} value={s.subject_key}>
                          {s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ""}
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
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ASSIGNMENT_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="attachment_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment URL (optional)</FormLabel>
                    <FormControl><Input placeholder="https://…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending ? "Saving..." : isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
