import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReminderStatus } from "./types";

const styles: Record<ReminderStatus, string> = {
  Upcoming: "border-primary/30 bg-primary/10 text-primary",
  "Due Today": "border-warning/30 bg-warning/15 text-warning",
  Overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  Completed: "border-success/30 bg-success/15 text-success",
};

export function ReminderBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {status}
    </Badge>
  );
}
