import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { communicationKeys, notificationsQuery } from "@/features/communication/queries";
import { NotificationCard } from "@/features/communication/notifications/NotificationCard";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — EduFlow" },
      { name: "description", content: "Your notification inbox." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "read";
const TYPES = ["Announcement", "Assignment", "Attendance", "Event", "System"] as const;

function NotificationsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(notificationsQuery(uid));
  const items = data ?? [];

  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState<string>("all");
  const [clearOpen, setClearOpen] = useState(false);

  const invalidate = () =>
    uid && qc.invalidateQueries({ queryKey: communicationKeys.notifications(uid) });

  const filtered = useMemo(
    () =>
      items.filter((n) => {
        if (filter === "unread" && n.is_read) return false;
        if (filter === "read" && !n.is_read) return false;
        if (type !== "all" && n.type !== type) return false;
        return true;
      }),
    [items, filter, type],
  );

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("student_id", uid)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("All marked as read");
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const clearAll = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      const { error } = await supabase.from("notifications").delete().eq("student_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setClearOpen(false);
      toast.success("Notifications cleared");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread of ${items.length} total.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={unreadCount === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
            <Button
              variant="outline"
              disabled={items.length === 0}
              onClick={() => setClearOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading notifications..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={items.length === 0 ? "You're all caught up" : "No matches"}
          description={
            items.length === 0
              ? "New announcements and events will appear here."
              : "Try adjusting your filters."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={() => markRead.mutate(n.id)}
              onDelete={() => remove.mutate(n.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all notifications?"
        description="This permanently deletes every notification in your inbox."
        confirmLabel="Clear all"
        onConfirm={() => clearAll.mutate()}
        loading={clearAll.isPending}
      />
    </div>
  );
}
