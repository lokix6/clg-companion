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
import { Switch } from "@/components/ui/switch";
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
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementPriority,
} from "@/features/communication/types";
import { communicationKeys } from "@/features/communication/queries";
import { adminKeys } from "../queries";
import { logAdminActivity } from "../logActivity";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  category: z.string(),
  priority: z.string(),
  is_pinned: z.boolean(),
  is_archived: z.boolean(),
  scheduled_for: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function AdminAnnouncementDialog({
  open,
  onOpenChange,
  announcement,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  announcement?: Announcement | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!announcement;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "General",
      priority: "Medium",
      is_pinned: false,
      is_archived: false,
      scheduled_for: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: announcement?.title ?? "",
        description: announcement?.description ?? "",
        category: announcement?.category ?? "General",
        priority: announcement?.priority ?? "Medium",
        is_pinned: announcement?.is_pinned ?? false,
        is_archived: announcement?.is_archived ?? false,
        scheduled_for: announcement?.scheduled_for
          ? new Date(announcement.scheduled_for).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [open, announcement, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        created_by: user.id,
        title: v.title.trim(),
        description: v.description.trim(),
        category: v.category as AnnouncementCategory,
        priority: v.priority as AnnouncementPriority,
        is_pinned: v.is_pinned,
        pinned_at: v.is_pinned ? new Date().toISOString() : null,
        is_archived: v.is_archived,
        scheduled_for: v.scheduled_for ? new Date(v.scheduled_for).toISOString() : null,
      };
      if (isEdit && announcement) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", announcement.id);
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Updated announcement",
          targetType: "announcement",
          targetId: announcement.id,
          metadata: { label: payload.title },
        });
      } else {
        const { data, error } = await supabase
          .from("announcements")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Created announcement",
          targetType: "announcement",
          targetId: data.id,
          metadata: { label: payload.title },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communicationKeys.announcements() });
      qc.invalidateQueries({ queryKey: adminKeys.announcements() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      toast.success(isEdit ? "Announcement updated" : "Announcement created");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Save failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit announcement" : "New announcement"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea rows={5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ANNOUNCEMENT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ANNOUNCEMENT_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="scheduled_for"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule for (optional)</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_pinned"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <FormLabel className="!m-0">Pinned</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_archived"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <FormLabel className="!m-0">Archived</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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
                {mutation.isPending ? "Saving..." : isEdit ? "Save" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
