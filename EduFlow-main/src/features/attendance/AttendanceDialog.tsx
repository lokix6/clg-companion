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
import { attendanceKeys } from "./queries";
import type { Attendance } from "./types";
import type { Subject } from "@/features/academic/types";

const schema = z
  .object({
    subject_id: z.string().min(1, "Subject is required"),
    total_classes: z.coerce.number().int().min(1, "Total classes must be greater than zero"),
    classes_attended: z.coerce.number().int().min(0, "Cannot be negative"),
  })
  .refine((v) => v.classes_attended <= v.total_classes, {
    message: "Attended classes cannot exceed total classes",
    path: ["classes_attended"],
  });
type Input = z.infer<typeof schema>;

export function AttendanceDialog({
  open,
  onOpenChange,
  record,
  subjects,
  existingSubjectIds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record?: Attendance | null;
  subjects: Subject[];
  existingSubjectIds: Set<string>;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!record;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { subject_id: "", total_classes: 0, classes_attended: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_id: record?.subject_id ?? "",
        total_classes: record?.total_classes ?? 0,
        classes_attended: record?.classes_attended ?? 0,
      });
    }
  }, [open, record, form]);

  const availableSubjects = subjects.filter(
    (s) => isEdit && record?.subject_id === s.id ? true : !existingSubjectIds.has(s.id),
  );

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        student_id: user.id,
        subject_id: values.subject_id,
        total_classes: values.total_classes,
        classes_attended: values.classes_attended,
      };
      if (isEdit && record) {
        const { error } = await supabase
          .from("attendance")
          .update(payload)
          .eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: attendanceKeys.all(user.id) });
      toast.success(isEdit ? "Attendance updated" : "Attendance added");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Attendance" : "Add Attendance"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSubjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No subjects available. Add subjects first.
                        </div>
                      ) : (
                        availableSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.subject_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_classes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total classes *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classes_attended"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attended *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Percentage is auto-calculated as (attended / total) × 100.
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
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Add attendance"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
