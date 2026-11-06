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
import { adminKeys, type AdminDepartment } from "../queries";
import { logAdminActivity } from "../logActivity";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  code: z.string().trim().min(1, "Required").max(40),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});
type Values = z.infer<typeof schema>;

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  department: AdminDepartment | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!department;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: department?.name ?? "",
        code: department?.code ?? "",
        description: department?.description ?? "",
        status: department?.status ?? "active",
      });
    }
  }, [open, department, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        name: v.name.trim(),
        code: v.code.trim().toUpperCase(),
        description: v.description?.trim() || null,
        status: v.status,
      };
      if (isEdit && department) {
        const { error } = await supabase
          .from("departments")
          .update(payload)
          .eq("id", department.id);
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Updated department",
          targetType: "department",
          targetId: department.id,
          metadata: { label: payload.name },
        });
      } else {
        const { data, error } = await supabase
          .from("departments")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Created department",
          targetType: "department",
          targetId: data.id,
          metadata: { label: payload.name },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.departments() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      toast.success(isEdit ? "Department updated" : "Department created");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string };
      if (err?.code === "23505") toast.error("Name or code already exists.");
      else toast.error(err?.message || "Save failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Computer Science" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl><Input {...field} placeholder="CSE" /></FormControl>
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
                    <Textarea {...field} rows={3} placeholder="Optional overview" />
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
