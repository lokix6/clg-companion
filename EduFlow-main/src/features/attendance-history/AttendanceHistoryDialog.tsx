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
import { attendanceHistoryKeys } from "./queries";
import { ATTENDANCE_STATUSES, todayISO, type AttendanceHistory } from "./types";
import type { Subject } from "@/features/academic/types";

const schema = z.object({
  subject_id: z.string().uuid("Select a subject"),
  class_date: z
    .string()
    .min(1, "Date is required")
    .refine((v) => v <= todayISO(), { message: "Date cannot be in the future" }),
  status: z.enum(["Present", "Absent"]),
  notes: z.string().max(500).optional(),
});
type Input = z.infer<typeof schema>;

export function AttendanceHistoryDialog({
  open,
  onOpenChange,
  subjects,
  entry,
  defaultSubjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: Subject[];
  entry?: AttendanceHistory | null;
  defaultSubjectId?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!entry;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_id: defaultSubjectId ?? "",
      class_date: todayISO(),
      status: "Present",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_id: entry?.subject_id ?? defaultSubjectId ?? subjects[0]?.id ?? "",
        class_date: entry?.class_date ?? todayISO(),
        status: (entry?.status as "Present" | "Absent") ?? "Present",
        notes: entry?.notes ?? "",
      });
    }
  }, [open, entry, defaultSubjectId, subjects, form]);

  const mutation = useMutation({
    mutationFn: async (v: Input) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        student_id: user.id,
        subject_id: v.subject_id,
        class_date: v.class_date,
        status: v.status,
        notes: v.notes?.trim() || null,
      };
      if (isEdit && entry) {
        const { error } = await supabase
          .from("attendance_history")
          .update(payload)
          .eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_history").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: attendanceHistoryKeys.all(user.id) });
      toast.success(isEdit ? "Record updated" : "Attendance recorded");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as { message?: string }).message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Attendance Record" : "Log Attendance"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
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
                name="class_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" max={todayISO()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ATTENDANCE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Optional..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Log attendance"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
