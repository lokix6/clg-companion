import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Subject } from "@/features/academic/types";
import type { RunningPoint } from "./analytics";
import type { AttendanceHistory } from "./types";

export function AttendanceTimeline({
  points,
  records,
  subjects,
  onEdit,
  onDelete,
}: {
  points: RunningPoint[];
  records: AttendanceHistory[];
  subjects: Map<string, Subject>;
  onEdit: (r: AttendanceHistory) => void;
  onDelete: (r: AttendanceHistory) => void;
}) {
  const recordsById = new Map(records.map((r) => [r.id, r]));
  const reversed = [...points].reverse();

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {reversed.map((p) => {
        const r = recordsById.get(p.id);
        if (!r) return null;
        const s = subjects.get(p.subjectId ?? "");
        const present = p.status === "Present";
        return (
          <li key={p.id} className="relative">
            <span
              className={cn(
                "absolute -left-[29px] top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background",
                present ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground",
              )}
              aria-hidden
            >
              {present ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            </span>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        present
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                      )}
                    >
                      {p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(`${p.date}T00:00:00`).toLocaleDateString([], {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">
                    {s?.subject_name ?? "Unknown subject"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s?.faculty_name || "—"} • {p.attended}/{p.total} classes
                  </div>
                  {r.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">{r.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Running
                    </div>
                    <div className="text-lg font-bold">{p.percent.toFixed(1)}%</div>
                  </div>
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(r)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(r)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
