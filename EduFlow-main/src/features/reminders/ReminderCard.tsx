import { Bell, CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { ReminderBadge } from "./ReminderBadge";
import { reminderStatus, type AssignmentReminder } from "./types";
import type { StudentAssignmentRow } from "@/features/assignments/types";

export function ReminderCard({
  reminder,
  assignment,
  onEdit,
  onDelete,
  onDismiss,
}: {
  reminder: AssignmentReminder;
  assignment?: StudentAssignmentRow;
  onEdit: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  const status = assignment
    ? reminderStatus(
        assignment.due_date,
        assignment.review_status && assignment.review_status !== "Pending" ? "Completed" : "Pending",
      )
    : "Upcoming";
  const dateLabel = new Date(`${reminder.reminder_date}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = reminder.reminder_time?.slice(0, 5);

  return (
    <InfoCard className={reminder.is_dismissed ? "opacity-60" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ReminderBadge status={status} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {reminder.reminder_type}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-sm font-semibold">
            {assignment?.title ?? "Assignment removed"}
          </h3>
          <div className="mt-1 text-xs text-muted-foreground">
             {assignment?.subject_name || assignment?.subject_code || "—"}
            {assignment && (
              <>
                {" • Due "}
                 {new Date(assignment.due_date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span>
              Notify on {dateLabel}
              {timeLabel && ` at ${timeLabel}`}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!reminder.is_dismissed && (
            <Button size="icon" variant="ghost" onClick={onDismiss} aria-label="Dismiss">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {reminder.is_dismissed && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Bell className="h-3 w-3" /> Dismissed
        </div>
      )}
    </InfoCard>
  );
}
