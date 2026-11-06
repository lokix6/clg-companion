import { useEffect } from "react";
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
import { communicationKeys, type AnnouncementForMe } from "../queries";
import { ANNOUNCEMENT_PRIORITIES } from "../types";

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  priority: z.string().min(1),
  audience_type: z.enum(["College", "Department", "Semester", "Subject"]),
  department_id: z.string().optional(),
  target_semester: z.string().optional(),
  catalog_subject_id: z.string().optional(),
  publish_status: z.enum(["Draft", "Published", "Archived"]),
});
type Input = z.infer<typeof schema>;

type SubjectOpt = { id: string; subject_name: string; subject_code: string | null; department_id: string | null; semester: number | null };

export function AnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  scope = "admin",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  announcement?: AnnouncementForMe | null;
  scope?: "admin" | "faculty";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!announcement;

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      audience_type: scope === "faculty" ? "Subject" : "College",
      publish_status: "Published",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: announcement?.title ?? "",
        description: announcement?.description ?? "",
        priority: announcement?.priority ?? "Medium",
        audience_type: announcement?.audience_type ?? (scope === "faculty" ? "Subject" : "College"),
        department_id: announcement?.department_id ?? undefined,
        target_semester: announcement?.target_semester ? String(announcement.target_semester) : undefined,
        catalog_subject_id: announcement?.catalog_subject_id ?? undefined,
        publish_status: announcement?.publish_status ?? "Published",
      });
    }
  }, [open, announcement, form, scope]);

  const audience = form.watch("audience_type");

  const depts = useQuery({
    queryKey: ["departments", "options"],
    enabled: open && scope === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjects = useQuery({
    queryKey: ["catalog-subjects", "for-me", scope],
    enabled: open,
    queryFn: async (): Promise<SubjectOpt[]> => {
      if (scope === "faculty") {
        const { data, error } = await supabase.rpc("faculty_catalog_subjects");
        if (error) throw error;
        return ((data ?? []) as Array<{ id: string; subject_name: string; subject_code: string | null; department_id: string | null; semester: number | null }>).map((r) => ({
          id: r.id,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          department_id: r.department_id,
          semester: r.semester,
        }));
      }
      const { data, error } = await supabase.rpc("admin_catalog_subjects");
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; subject_name: string; subject_code: string | null; department_id: string | null; semester: number | null }>).map((r) => ({
        id: r.id,
        subject_name: r.subject_name,
        subject_code: r.subject_code,
        department_id: r.department_id,
        semester: r.semester,
      }));
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");
      let department_id = values.department_id || null;
      let target_semester = values.target_semester ? Number(values.target_semester) : null;
      let catalog_subject_id: string | null = null;

      if (values.audience_type === "College") {
        department_id = null;
        target_semester = null;
      } else if (values.audience_type === "Subject") {
        if (!values.catalog_subject_id) throw new Error("Select a subject");
        catalog_subject_id = values.catalog_subject_id;
        const s = subjects.data?.find((x) => x.id === values.catalog_subject_id);
        department_id = s?.department_id ?? null;
        target_semester = s?.semester ?? null;
      } else if (values.audience_type === "Department") {
        if (!department_id) throw new Error("Select a department");
        target_semester = null;
      } else if (values.audience_type === "Semester") {
        if (!department_id) throw new Error("Select a department");
        if (!target_semester) throw new Error("Select a semester");
      }

      const payload = {
        created_by: user.id,
        title: values.title.trim(),
        description: values.description.trim(),
        category: "General" as const,
        priority: values.priority as "High" | "Medium" | "Low",
        audience_type: values.audience_type,
        department_id,
        target_semester,
        catalog_subject_id,
        publish_status: values.publish_status,
      };
      if (isEdit && announcement) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", announcement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communicationKeys.announcements() });
      if (user) qc.invalidateQueries({ queryKey: communicationKeys.notifications(user.id) });
      toast.success(isEdit ? "Announcement updated" : "Announcement posted");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message || "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Announcement" : "Post Announcement"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input placeholder="Announcement title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Textarea rows={4} placeholder="Full announcement details..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ANNOUNCEMENT_PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="publish_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="audience_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Audience</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {scope === "admin" && <SelectItem value="College">Entire College</SelectItem>}
                    {scope === "admin" && <SelectItem value="Department">Department</SelectItem>}
                    {scope === "admin" && <SelectItem value="Semester">Semester (in dept)</SelectItem>}
                    <SelectItem value="Subject">Subject</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {(audience === "Department" || audience === "Semester") && scope === "admin" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="department_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(depts.data ?? []).map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {audience === "Semester" && (
                  <FormField control={form.control} name="target_semester" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8].map((n) => (<SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
              </div>
            )}

            {audience === "Subject" && (
              <FormField control={form.control} name="catalog_subject_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(subjects.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject_code ? `${s.subject_code} — ` : ""}{s.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-gradient-primary shadow-elegant hover:opacity-95">
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Post announcement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
