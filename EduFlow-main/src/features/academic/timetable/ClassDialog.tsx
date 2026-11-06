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
import { academicKeys } from "@/features/academic/queries";
import { DAYS_OF_WEEK, type DayOfWeek, type Subject, type Timetable } from "@/features/academic/types";

const schema = z
  .object({
    subject_id: z.string().min(1, "Select a subject"),
    day_of_week: z.string().min(1, "Select day"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    room_number: z.string().optional(),
    building: z.string().optional(),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });
type Input = z.infer<typeof schema>;

export function ClassDialog({
  open,
  onOpenChange,
  entry,
  subjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry?: Timetable | null;
  subjects: Subject[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!entry;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_id: "",
      day_of_week: "",
      start_time: "",
      end_time: "",
      room_number: "",
      building: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_id: entry?.subject_id ?? "",
        day_of_week: entry?.day_of_week ?? "",
        start_time: entry?.start_time?.slice(0, 5) ?? "",
        end_time: entry?.end_time?.slice(0, 5) ?? "",
        room_number: entry?.room_number ?? "",
        building: entry?.building ?? "",
      });
    }
  }, [open, entry, form]);

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        student_id: user.id,
        subject_id: values.subject_id,
        day_of_week: values.day_of_week as DayOfWeek,
        start_time: values.start_time,
        end_time: values.end_time,
        room_number: values.room_number?.trim() || null,
        building: values.building?.trim() || null,
      };
      if (isEdit && entry) {
        const { error } = await supabase.from("timetable").update(payload).eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: academicKeys.timetable(user.id) });
      toast.success(isEdit ? "Class updated" : "Class added");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Could not save class");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        {subjects.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add a subject first before scheduling a class.
          </div>
        ) : (
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
                        <SelectTrigger>
                          <SelectValue placeholder="Choose subject" />
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
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
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
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start time *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End time *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="room_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <FormControl>
                        <Input placeholder="204" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building</FormLabel>
                      <FormControl>
                        <Input placeholder="Engineering Block" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-gradient-primary shadow-elegant hover:opacity-95"
                >
                  {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Add class"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
