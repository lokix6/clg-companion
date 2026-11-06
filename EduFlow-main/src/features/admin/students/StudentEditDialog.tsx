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
import { logAdminActivity } from "../logActivity";
import { adminKeys, type AdminStudent } from "../queries";

const schema = z.object({
  full_name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(255).or(z.literal("")).optional(),
  college_name: z.string().trim().max(160).optional(),
  branch: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  semester: z.coerce.number().int().min(1).max(12).optional().or(z.nan().transform(() => undefined)),
  status: z.enum(["active", "inactive", "deleted"]),
  role: z.enum(["student", "admin", "faculty", "parent"]),
});
type Values = z.infer<typeof schema>;

export function StudentEditDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  student: AdminStudent | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      college_name: "",
      branch: "",
      department: "",
      semester: undefined,
      status: "active",
      role: "student",
    },
  });

  useEffect(() => {
    if (open && student) {
      form.reset({
        full_name: student.full_name ?? "",
        email: student.email ?? "",
        college_name: student.college_name ?? "",
        branch: student.branch ?? "",
        department: student.department ?? "",
        semester: student.semester ?? undefined,
        status: student.status,
        role: (student.role as Values["role"]) ?? "student",
      });
    }
  }, [open, student, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!student || !user) throw new Error("Missing context");
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: v.full_name || null,
          email: v.email || null,
          college_name: v.college_name || null,
          branch: v.branch || null,
          department: v.department || null,
          semester: v.semester ?? null,
          status: v.status,
          deleted_at: v.status === "deleted" ? new Date().toISOString() : null,
          role_updated_by: user.id,
        })
        .eq("id", student.id);
      if (pErr) throw pErr;

      if (v.role !== student.role) {
        await supabase.from("user_roles").delete().eq("user_id", student.id);
        const { error: rErr } = await supabase
          .from("user_roles")
          .insert({ user_id: student.id, role: v.role });
        if (rErr) throw rErr;
      }

      await logAdminActivity({
        actorId: user.id,
        action: "Updated student",
        targetType: "profile",
        targetId: student.id,
        metadata: { label: v.full_name || student.email || student.id, status: v.status, role: v.role },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.students() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      toast.success("Student updated");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Update failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="college_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl><Input {...field} placeholder="CSE, ECE..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                      <Input
                        type="number"
                        min={1}
                        max={12}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="deleted">Deleted (soft)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="faculty">Faculty (future)</SelectItem>
                        <SelectItem value="parent">Parent (future)</SelectItem>
                      </SelectContent>
                    </Select>
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
                {mutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
