import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Subject } from "@/features/academic/types";
import type { RunningPoint } from "./analytics";
import type { AttendanceHistory } from "./types";

export function AttendanceTable({
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
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Subject</th>
            <th className="hidden p-3 text-left md:table-cell">Faculty</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-right">Classes</th>
            <th className="p-3 text-right">Attendance %</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reversed.map((p) => {
            const r = recordsById.get(p.id);
            if (!r) return null;
            const s = subjects.get(p.subjectId ?? "");
            const present = p.status === "Present";
            return (
              <tr key={p.id} className="hover:bg-accent/40">
                <td className="whitespace-nowrap p-3 text-xs">
                  {new Date(`${p.date}T00:00:00`).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="p-3 font-medium">{s?.subject_name ?? "—"}</td>
                <td className="hidden p-3 text-muted-foreground md:table-cell">
                  {s?.faculty_name || "—"}
                </td>
                <td className="p-3">
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
                </td>
                <td className="p-3 text-right text-xs text-muted-foreground">
                  {p.attended}/{p.total}
                </td>
                <td className="p-3 text-right font-semibold">{p.percent.toFixed(1)}%</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
