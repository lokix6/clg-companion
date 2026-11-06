import { CalendarClock, Check, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/Badges";
import { cn } from "@/lib/utils";
import type { Assignment, Subject } from "@/features/academic/types";

export function daysRemaining(due: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

export function AssignmentCard({
  assignment,
  subject,
  onEdit,
  onDelete,
  onMarkCompleted,
}: {
  assignment: Assignment;
  subject?: Subject;
  onEdit: () => void;
  onDelete: () => void;
  onMarkCompleted: () => void;
}) {
  const days = daysRemaining(assignment.due_date);
  const isOverdue = days < 0 && assignment.status !== "Completed";
  const dueLabel = new Date(assignment.due_date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let daysLabel: string;
  if (assignment.status === "Completed") daysLabel = "Completed";
  else if (days === 0) daysLabel = "Due today";
  else if (days < 0) daysLabel = `${Math.abs(days)}d overdue`;
  else daysLabel = `${days}d left`;

  const isFacultyShared = !!assignment.created_by || assignment.is_shared;
  const subjectLabel = subject?.subject_name ?? assignment.subject_code ?? null;
  const maxMarks = (assignment as unknown as { max_marks?: number | null }).max_marks;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {subjectLabel && (
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              {subjectLabel}
            </div>
          )}
          <div className="mt-1 text-base font-semibold">{assignment.title}</div>
          {assignment.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {assignment.description}
            </p>
          )}
        </div>
        {!isFacultyShared && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {assignment.status !== "Completed" && (
                <DropdownMenuItem onClick={onMarkCompleted}>
                  <Check className="mr-2 h-4 w-4" /> Mark completed
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isFacultyShared && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/15">From faculty</Badge>
        )}
        <StatusBadge status={assignment.status} />
        <PriorityBadge priority={assignment.priority} />
        {maxMarks != null && (
          <Badge variant="outline">{maxMarks} marks</Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{dueLabel}</span>
        </div>
        <div
          className={cn(
            "font-semibold",
            assignment.status === "Completed"
              ? "text-success"
              : isOverdue
                ? "text-destructive"
                : days <= 2
                  ? "text-warning"
                  : "text-muted-foreground",
          )}
        >
          {daysLabel}
        </div>
      </div>
    </div>
  );
}
