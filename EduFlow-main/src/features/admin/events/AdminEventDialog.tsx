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
  EVENT_CATEGORIES,
  type Event,
  type EventCategory,
} from "@/features/communication/types";
import { communicationKeys } from "@/features/communication/queries";
import { adminKeys } from "../queries";
import { logAdminActivity } from "../logActivity";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  event_date: z.string().min(1),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  venue: z.string().trim().min(1).max(200),
  organizer: z.string().trim().max(200).optional(),
  category: z.string(),
  is_featured: z.boolean(),
  is_cancelled: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function AdminEventDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: Event | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!event;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      venue: "",
      organizer: "",
      category: "General",
      is_featured: false,
      is_cancelled: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: event?.title ?? "",
        description: event?.description ?? "",
        event_date: event?.event_date ?? "",
        start_time: event?.start_time?.slice(0, 5) ?? "",
        end_time: event?.end_time?.slice(0, 5) ?? "",
        venue: event?.venue ?? "",
        organizer: event?.organizer ?? "",
        category: event?.category ?? "General",
        is_featured: event?.is_featured ?? false,
        is_cancelled: event?.is_cancelled ?? false,
      });
    }
  }, [open, event, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        created_by: user.id,
        title: v.title.trim(),
        description: v.description?.trim() || null,
        event_date: v.event_date,
        start_time: v.start_time || null,
        end_time: v.end_time || null,
        venue: v.venue.trim(),
        organizer: v.organizer?.trim() || null,
        category: v.category as EventCategory,
        is_featured: v.is_featured,
        is_cancelled: v.is_cancelled,
      };
      if (isEdit && event) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Updated event",
          targetType: "event",
          targetId: event.id,
          metadata: { label: payload.title },
        });
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await logAdminActivity({
          actorId: user.id,
          action: "Created event",
          targetType: "event",
          targetId: data.id,
          metadata: { label: payload.title },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communicationKeys.events() });
      qc.invalidateQueries({ queryKey: adminKeys.events() });
      qc.invalidateQueries({ queryKey: adminKeys.activity() });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
      toast.success(isEdit ? "Event updated" : "Event created");
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
          <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="event_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>End</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="venue" render={({ field }) => (
              <FormItem>
                <FormLabel>Venue *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="organizer" render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizer</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="is_featured" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="!m-0">Featured</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_cancelled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="!m-0">Cancelled</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending ? "Saving..." : isEdit ? "Save" : "Publish"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
