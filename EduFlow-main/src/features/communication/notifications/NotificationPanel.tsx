import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { notificationsQuery, communicationKeys } from "../queries";
import { NotificationCard } from "./NotificationCard";
import { EmptyState } from "@/components/dashboard/EmptyState";

export function NotificationPanel() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data } = useQuery(notificationsQuery(uid));
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.is_read);
  const invalidate = () =>
    uid && qc.invalidateQueries({ queryKey: communicationKeys.notifications(uid) });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
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
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread.length} unread of {notifications.length}
            </div>
          </div>
          {unread.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => markAll.mutate()}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all
            </Button>
          )}
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" description="No notifications yet." />
          ) : (
            notifications.slice(0, 10).map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                compact
                onMarkRead={() => markRead.mutate(n.id)}
                onDelete={() => remove.mutate(n.id)}
              />
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/dashboard/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
