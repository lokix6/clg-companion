import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssignmentPriority, AssignmentStatus } from "@/features/academic/types";

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, string> = {
    Pending: "bg-warning/15 text-warning border-warning/30",
    "In Progress": "bg-primary/10 text-primary border-primary/30",
    Completed: "bg-success/15 text-success border-success/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[status])}>
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: AssignmentPriority }) {
  const map: Record<AssignmentPriority, string> = {
    Low: "bg-muted text-muted-foreground border-border",
    Medium: "bg-primary/10 text-primary border-primary/30",
    High: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[priority])}>
      {priority}
    </Badge>
  );
}
