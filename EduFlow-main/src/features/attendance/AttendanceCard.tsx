import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { attendanceStatus, type Attendance } from "./types";
import type { Subject } from "@/features/academic/types";

const STATUS_STYLES = {
  good: {
    label: "On track",
    badge: "bg-success/15 text-success border-success/30",
    bar: "[&>div]:bg-success",
  },
  warning: {
    label: "Needs attention",
    badge: "bg-warning/15 text-warning border-warning/30",
    bar: "[&>div]:bg-warning",
  },
  danger: {
    label: "Critical",
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    bar: "[&>div]:bg-destructive",
  },
} as const;

export function AttendanceCard({
  record,
  subject,
  onEdit,
  onDelete,
}: {
  record: Attendance;
  subject?: Subject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Number(record.attendance_percentage);
  const status = attendanceStatus(pct);
  const style = STATUS_STYLES[status];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {subject?.subject_name ?? "Unknown subject"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {subject?.faculty_name ?? "—"}
              </div>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("font-medium", style.badge)}>
          {style.label}
        </Badge>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold">{pct.toFixed(1)}%</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {record.classes_attended} of {record.total_classes} classes
          </div>
        </div>
      </div>
      <Progress value={Math.min(pct, 100)} className={cn("mt-3 h-2", style.bar)} />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          Updated {new Date(record.last_updated).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
