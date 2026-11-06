import { useEffect, useMemo } from "react";
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
import type { StudentAssignmentRow } from "@/features/assignments/types";
import { reminderKeys } from "./queries";
import {
  REMINDER_TYPES,
  computeReminderDate,
  type AssignmentReminder,
  type ReminderTypeEnum,
} from "./types";

const schema = z.object({
  assignment_id: z.string().uuid("Select an assignment"),
  reminder_type: z.enum(["1 day before", "3 days before", "7 days before", "Custom"]),
  reminder_date: z.string().min(1, "Required"),
  reminder_time: z.string().optional(),
});
type Input = z.infer<typeof schema>;

export function ReminderDialog({
  open,
  onOpenChange,
  assignments,
  reminder,
  defaultAssignmentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignments: StudentAssignmentRow[];
  reminder?: AssignmentReminder | null;
  defaultAssignmentId?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!reminder;

  const assignmentsById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      assignment_id: defaultAssignmentId ?? "",
      reminder_type: "1 day before",
      reminder_date: "",
      reminder_time: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        assignment_id: reminder?.assignment_id ?? defaultAssignmentId ?? assignments[0]?.id ?? "",
        reminder_type: (reminder?.reminder_type as ReminderTypeEnum) ?? "1 day before",
        reminder_date: reminder?.reminder_date ?? "",
        reminder_time: reminder?.reminder_time?.slice(0, 5) ?? "",
      });
    }
  }, [open, reminder, defaultAssignmentId, assignments, form]);

  const assignmentId = form.watch("assignment_id");
  const type = form.watch("reminder_type");
  const selectedAssignment = assignmentsById.get(assignmentId);

  // Auto-compute reminder_date when type or assignment changes and type !== Custom
  useEffect(() => {
    if (!selectedAssignment || type === "Custom") return;
    form.setValue("reminder_date", computeReminderDate(selectedAssignment.due_date, type), {
      shouldValidate: true,
    });
  }, [selectedAssignment, type, form]);

  const mutation = useMutation({
    mutationFn: async (v: Input) => {
      if (!user) throw new Error("Not signed in");
      const asg = assignmentsById.get(v.assignment_id);
      if (!asg) throw new Error("Assignment not found");
       if (v.reminder_date > asg.due_date.slice(0, 10)) {
        throw new Error("Reminder date cannot be after the assignment due date");
      }
      const payload = {
        student_id: user.id,
        assignment_id: v.assignment_id,
        reminder_type: v.reminder_type,
        reminder_date: v.reminder_date,
        reminder_time: v.reminder_time || null,
      };
      if (isEdit && reminder) {
        const { error } = await supabase
          .from("assignment_reminders")
          .update(payload)
          .eq("id", reminder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assignment_reminders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: reminderKeys.all(user.id) });
      toast.success(isEdit ? "Reminder updated" : "Reminder created");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as { message?: string }).message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Reminder" : "Create Reminder"}</DialogTitle>
        </DialogHeader>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create an assignment first to set a reminder.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="assignment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Choose assignment" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reminder_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {REMINDER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reminder_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                           max={selectedAssignment?.due_date.slice(0, 10)}
                          disabled={type !== "Custom"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reminder_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {selectedAssignment && (
                <p className="text-xs text-muted-foreground">
                  Assignment due{" "}
                   {new Date(selectedAssignment.due_date).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-gradient-primary shadow-elegant hover:opacity-95"
                >
                  {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create reminder"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
