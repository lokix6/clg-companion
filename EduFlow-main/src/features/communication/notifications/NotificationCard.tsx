import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationTypeBadge } from "../Badges";
import { relativeTime, type Notification } from "../types";

export function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  compact,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors",
        notification.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5",
        compact && "p-2.5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <NotificationTypeBadge type={notification.type} />
          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
          <span className="text-[11px] text-muted-foreground">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-semibold">{notification.title}</div>
        <p className={cn("text-xs text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>
          {notification.message}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!notification.is_read && (
          <Button size="icon" variant="ghost" onClick={onMarkRead} aria-label="Mark as read">
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
