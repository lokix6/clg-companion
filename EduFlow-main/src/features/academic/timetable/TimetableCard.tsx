import { Clock, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Subject, Timetable } from "@/features/academic/types";

export function formatTime(t: string) {
  // t is "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TimetableCard({
  entry,
  subject,
  isCurrent,
  onEdit,
  onDelete,
}: {
  entry: Timetable;
  subject?: Subject;
  isCurrent?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border p-4 shadow-card transition-shadow",
        isCurrent
          ? "border-primary/50 bg-primary/5 shadow-elegant"
          : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          isCurrent ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Clock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {subject?.subject_name ?? "Unknown subject"}
            </div>
            {subject?.faculty_name && (
              <div className="truncate text-xs text-muted-foreground">{subject.faculty_name}</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
          </span>
          {(entry.room_number || entry.building) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[entry.room_number, entry.building].filter(Boolean).join(", ")}
            </span>
          )}
          {isCurrent && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              Now
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
