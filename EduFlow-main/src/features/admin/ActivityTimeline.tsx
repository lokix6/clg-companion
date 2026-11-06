import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import type { AdminActivity } from "./queries";

export function ActivityTimeline({ items }: { items: AdminActivity[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No recent activity yet.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {items.map((a) => {
        const meta = a.metadata as { label?: string; name?: string };
        const detail = meta?.label || meta?.name;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 border-b border-border/60 pb-3 last:border-b-0">
              <div className="text-sm font-medium">
                {a.action}
                {a.target_type && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    · {a.target_type}
                  </span>
                )}
              </div>
              {detail && (
                <div className="truncate text-xs text-muted-foreground">{detail}</div>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
