import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  assignmentsQuery,
  subjectsQuery,
  timetableQuery,
} from "@/features/academic/queries";
import { attendanceQuery } from "@/features/attendance/queries";
import { notesQuery } from "@/features/notes/queries";
import {
  generateAssignmentsReport,
  generateAttendanceReport,
  generateNotesReport,
  generateSemesterReport,
  generateTimetableReport,
  type ReportKind,
} from "./pdf";

const OPTIONS: { value: ReportKind; label: string; description: string }[] = [
  { value: "attendance", label: "Attendance Report", description: "Per-subject percentages and totals." },
  { value: "assignments", label: "Assignments Report", description: "All assignments with status and due dates." },
  { value: "timetable", label: "Timetable", description: "Weekly class schedule with faculty and rooms." },
  { value: "notes", label: "Notes Summary", description: "All uploaded study notes." },
  { value: "semester", label: "Semester Summary", description: "Full academic snapshot for the semester." },
];

export function ExportDialog({
  trigger,
  defaultKind,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  defaultKind?: ReportKind;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [kind, setKind] = useState<ReportKind>(defaultKind ?? "attendance");
  const [busy, setBusy] = useState(false);
  const { profile, user } = useAuth();
  const uid = user?.id;

  const subjectsQ = useQuery(subjectsQuery(uid));
  const attendanceQ = useQuery(attendanceQuery(uid));
  const assignmentsQ = useQuery(assignmentsQuery(uid));
  const timetableQ = useQuery(timetableQuery(uid));
  const notesQ = useQuery(notesQuery(uid));

  const handleExport = async () => {
    setBusy(true);
    try {
      const subjects = subjectsQ.data ?? [];
      const attendance = attendanceQ.data ?? [];
      const assignments = assignmentsQ.data ?? [];
      const timetable = timetableQ.data ?? [];
      const notes = notesQ.data ?? [];
      switch (kind) {
        case "attendance":
          generateAttendanceReport(profile, attendance, subjects);
          break;
        case "assignments":
          generateAssignmentsReport(profile, assignments, subjects);
          break;
        case "timetable":
          generateTimetableReport(profile, timetable, subjects);
          break;
        case "notes":
          generateNotesReport(profile, notes, subjects);
          break;
        case "semester":
          generateSemesterReport(profile, {
            subjects,
            attendance,
            assignments,
            notes,
            timetableCount: timetable.length,
          });
          break;
      }
      toast.success("PDF downloaded");
      setOpen(false);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>Generate a professional printable report.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={kind} onValueChange={(v) => setKind(v as ReportKind)} className="space-y-2">
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              htmlFor={`report-${o.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent has-[button[data-state=checked]]:border-primary/60 has-[button[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem id={`report-${o.value}`} value={o.value} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <Label htmlFor={`report-${o.value}`} className="cursor-pointer text-sm font-semibold">
                    {o.label}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">{o.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            disabled={busy}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Download className="mr-1.5 h-4 w-4" />
            {busy ? "Generating..." : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExportButton({
  defaultKind,
  label = "Export PDF",
  variant = "outline",
}: {
  defaultKind?: ReportKind;
  label?: string;
  variant?: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Download className="mr-1.5 h-4 w-4" /> {label}
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} defaultKind={defaultKind} />
    </>
  );
}
