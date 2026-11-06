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
import { academicKeys } from "@/features/academic/queries";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  type Assignment,
  type AssignmentPriority,
  type AssignmentStatus,
  type Subject,
} from "@/features/academic/types";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  subject_id: z.string().optional(),
  description: z.string().max(2000).optional(),
  due_date: z.string().min(1, "Due date is required"),
  priority: z.string().min(1),
  status: z.string().min(1),
});
type Input = z.infer<typeof schema>;

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  subjects,
  defaultSubjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment?: Assignment | null;
  subjects: Subject[];
  defaultSubjectId?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!assignment;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      subject_id: "",
      description: "",
      due_date: "",
      priority: "Medium",
      status: "Pending",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: assignment?.title ?? "",
        subject_id: assignment?.subject_id ?? defaultSubjectId ?? "",
        description: assignment?.description ?? "",
        due_date: assignment?.due_date ? toLocalInputValue(assignment.due_date) : "",
        priority: assignment?.priority ?? "Medium",
        status: assignment?.status ?? "Pending",
      });
    }
  }, [open, assignment, defaultSubjectId, form]);

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        student_id: user.id,
        title: values.title.trim(),
        subject_id: values.subject_id || null,
        description: values.description?.trim() || null,
        due_date: new Date(values.due_date).toISOString(),
        priority: values.priority as AssignmentPriority,
        status: values.status as AssignmentStatus,
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
      if (user) qc.invalidateQueries({ queryKey: academicKeys.assignments(user.id) });
      toast.success(isEdit ? "Assignment updated" : "Assignment added");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Could not save assignment");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Assignment title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject_name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNMENT_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              File attachments will be enabled in a future release.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Add assignment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
