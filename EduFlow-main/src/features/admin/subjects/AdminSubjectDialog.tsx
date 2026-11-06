import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  adminDepartmentsQueryOptions,
  adminFacultyOptionsQueryOptions,
  adminKeys,
  type AdminSubject,
} from "../queries";
import { logAdminActivity } from "../logActivity";

const NONE = "__none__";

const schema = z.object({
  subject_name: z.string().trim().min(1, "Required").max(160),
  subject_code: z.string().trim().min(1, "Required").max(40),
  department_id: z.string().min(1, "Required"),
  faculty_id: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(12).optional().or(z.nan().transform(() => undefined)),
  credits: z.coerce.number().int().min(0).max(20).optional().or(z.nan().transform(() => undefined)),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});
type Values = z.infer<typeof schema>;

export function AdminSubjectDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject: AdminSubject | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!subject;

  const departments = useQuery(adminDepartmentsQueryOptions());
  const faculty = useQuery(adminFacultyOptionsQueryOptions());

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_name: "",
      subject_code: "",
      department_id: "",
      faculty_id: NONE,
      semester: undefined,
      credits: undefined,
      description: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_name: subject?.subject_name ?? "",
        subject_code: subject?.subject_code ?? "",
        department_id: subject?.department_id ?? "",
        faculty_id: subject?.faculty_id ?? NONE,
        semester: subject?.semester ?? undefined,
        credits: subject?.credits ?? undefined,
        description: subject?.description ?? "",
        status: subject?.status ?? "active",
      });
    }
  }, [open, subject, form]);

  const facultyOptions = useMemo(() => faculty.data ?? [], [faculty.data]);
  const deptOptions = useMemo(
    () => (departments.data ?? []).filter((d) => d.status === "active" || d.id === subject?.department_id),
    [departments.data, subject?.department_id],
  );

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const facultyRow = facultyOptions.find((f) => f.id === v.faculty_id);
      const payload = {
        subject_name: v.subject_name.trim(),
        subject_code: v.subject_code.trim().toUpperCase(),
        department_id: v.department_id,
        faculty_id: v.faculty_id && v.faculty_id !== NONE ? v.faculty_id : null,
        faculty_name: facultyRow?.full_name ?? facultyRow?.email ?? null,
        faculty_email: facultyRow?.email ?? null,
        semester: v.semester ?? null,
        credits: v.credits ?? null,
        description: v.description?.trim() || null,
        status: v.status,
        is_catalog: true,
        student_id: null,
      };
      if (isEdit && subject) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", subject.id);
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Updated subject",
          targetType: "subject",
          targetId: subject.id,
          metadata: { label: payload.subject_name },
        });
      } else {
        const { data, error } = await supabase
          .from("subjects")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Created subject",
          targetType: "subject",
          targetId: data.id,
          metadata: { label: payload.subject_name },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.subjects() });
      qc.invalidateQueries({ queryKey: adminKeys.departments() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      qc.invalidateQueries({ queryKey: ["faculty"] });
      toast.success(isEdit ? "Subject updated" : "Subject created");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string };
      if (err?.code === "23505") toast.error("Subject code must be unique.");
      else toast.error(err?.message || "Save failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <FormField
                control={form.control}
                name="subject_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject name *</FormLabel>
                    <FormControl><Input {...field} placeholder="Data Structures" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl><Input {...field} placeholder="CS201" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deptOptions.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No departments yet.
                          </div>
                        )}
                        {deptOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}{d.code ? ` (${d.code})` : ""}
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
                name="faculty_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned faculty</FormLabel>
                    <Select value={field.value ?? NONE} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {facultyOptions.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.full_name || f.email || "Faculty"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min={1} max={12}
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
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min={0} max={20}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Optional description shown to students" />
                  </FormControl>
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
                {mutation.isPending ? "Saving..." : isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
