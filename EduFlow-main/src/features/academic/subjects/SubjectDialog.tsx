import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { academicKeys } from "@/features/academic/queries";
import type { Subject } from "@/features/academic/types";

const schema = z.object({
  subject_name: z.string().trim().min(1, "Subject name is required").max(120),
  faculty_name: z.string().trim().min(1, "Faculty name is required").max(120),
  subject_code: z.string().trim().max(40).optional().or(z.literal("")),
  faculty_email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  credits: z.string().optional(),
  semester: z.string().optional(),
});
type Input = z.infer<typeof schema>;

export function SubjectDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject?: Subject | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!subject;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_name: "",
      faculty_name: "",
      subject_code: "",
      faculty_email: "",
      credits: "",
      semester: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_name: subject?.subject_name ?? "",
        faculty_name: subject?.faculty_name ?? "",
        subject_code: subject?.subject_code ?? "",
        faculty_email: subject?.faculty_email ?? "",
        credits: subject?.credits != null ? String(subject.credits) : "",
        semester: subject?.semester != null ? String(subject.semester) : "",
      });
    }
  }, [open, subject, form]);

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        student_id: user.id,
        subject_name: values.subject_name.trim(),
        faculty_name: values.faculty_name.trim(),
        subject_code: values.subject_code?.trim() || null,
        faculty_email: values.faculty_email?.trim() || null,
        credits: values.credits ? parseInt(values.credits, 10) : null,
        semester: values.semester ? parseInt(values.semester, 10) : null,
      };
      if (isEdit && subject) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: academicKeys.subjects(user.id) });
      toast.success(isEdit ? "Subject updated" : "Subject added");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string };
      if (err?.code === "23505") {
        toast.error("A subject with this name already exists.");
      } else {
        toast.error(err?.message || "Could not save subject");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this subject's details." : "Add a subject to your academic list."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Data Structures" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="subject_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CS201" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={20} placeholder="4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="faculty_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Prof. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="faculty_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faculty email</FormLabel>
                    <FormControl>
                      <Input placeholder="jane@college.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} placeholder="3" {...field} />
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
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Add subject"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
