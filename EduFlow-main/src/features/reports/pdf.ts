import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Profile } from "@/lib/auth/AuthProvider";
import type { Assignment, Subject, Timetable } from "@/features/academic/types";
import type { Attendance } from "@/features/attendance/types";
import type { Note } from "@/features/notes/types";
import { REPORT_LOGO_PNG } from "./logo-data";

export type ReportKind =
  | "attendance"
  | "assignments"
  | "timetable"
  | "notes"
  | "semester";

const BRAND = "EduFlow";
const TAGLINE = "CollegeCompanion";

function drawHeader(doc: jsPDF, title: string, profile: Profile | null) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(88, 80, 236); // indigo accent (approx to primary)
  doc.rect(0, 0, w, 22, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(17, 11, 7, "F");
  try {
    doc.addImage(REPORT_LOGO_PNG, "PNG", 11, 5, 12, 12);
  } catch {
    /* logo optional */
  }
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(BRAND, 28, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(TAGLINE, 28, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 14, 13, { align: "right" });

  // Student meta block
  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: string[] = [];
  meta.push(`Student: ${profile?.full_name || "—"}`);
  if (profile?.college_name) meta.push(`College: ${profile.college_name}`);
  const line2: string[] = [];
  if (profile?.branch) line2.push(`Department: ${profile.branch}`);
  if (profile?.semester) line2.push(`Semester: ${profile.semester}`);
  if (profile?.email) line2.push(`Email: ${profile.email}`);
  const generated = new Date().toLocaleString();
  doc.text(meta.join("   |   "), 14, 32);
  if (line2.length) doc.text(line2.join("   |   "), 14, 38);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${generated}`, 14, 44);
  doc.setDrawColor(220);
  doc.line(14, 47, w - 14, 47);
}

function drawFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(230);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${BRAND} • ${TAGLINE}`, 14, h - 8);
    doc.text(`Page ${i} of ${total}`, w - 14, h - 8, { align: "right" });
  }
}

function tableTheme() {
  return {
    theme: "grid" as const,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [88, 80, 236] as [number, number, number], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 246, 251] as [number, number, number] },
    margin: { left: 14, right: 14 },
  };
}

function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(title, 14, y);
}

function drawEmpty(doc: jsPDF, y: number, message: string) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(message, 14, y);
}

function saveReport(doc: jsPDF, filename: string) {
  drawFooter(doc);
  doc.save(filename);
}

function slug(profile: Profile | null): string {
  return (profile?.full_name || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ------------------ Attendance ------------------

export function generateAttendanceReport(
  profile: Profile | null,
  attendance: Attendance[],
  subjects: Subject[],
) {
  const doc = new jsPDF();
  drawHeader(doc, "Attendance Report", profile);
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const rows = attendance.map((a) => {
    const s = subjectsById.get(a.subject_id);
    return [
      s?.subject_name ?? "—",
      s?.subject_code ?? "—",
      String(a.classes_attended),
      String(a.total_classes),
      `${Number(a.attendance_percentage ?? 0).toFixed(1)}%`,
    ];
  });

  const overall =
    attendance.reduce((sum, a) => sum + (a.total_classes > 0 ? a.classes_attended : 0), 0) /
    Math.max(
      1,
      attendance.reduce((sum, a) => sum + (a.total_classes || 0), 0),
    );

  drawSectionTitle(doc, 55, `Summary: ${attendance.length} subject(s) • Overall ${(overall * 100).toFixed(1)}%`);
  if (rows.length === 0) {
    drawEmpty(doc, 65, "No attendance records available.");
  } else {
    autoTable(doc, {
      ...tableTheme(),
      startY: 60,
      head: [["Subject", "Code", "Attended", "Total", "Percentage"]],
      body: rows,
    });
  }
  saveReport(doc, `attendance-${slug(profile)}.pdf`);
}

// ------------------ Assignments ------------------

export function generateAssignmentsReport(
  profile: Profile | null,
  assignments: Assignment[],
  subjects: Subject[],
) {
  const doc = new jsPDF();
  drawHeader(doc, "Assignments Report", profile);
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const pending = assignments.filter((a) => a.status !== "Completed").length;
  const completed = assignments.length - pending;

  drawSectionTitle(
    doc,
    55,
    `Summary: ${assignments.length} total • ${pending} pending • ${completed} completed`,
  );
  const rows = assignments.map((a) => [
    a.title,
    a.subject_id ? subjectsById.get(a.subject_id)?.subject_name ?? "—" : "—",
    a.status,
    a.priority,
    new Date(a.due_date).toLocaleDateString(),
  ]);
  if (rows.length === 0) {
    drawEmpty(doc, 65, "No assignments available.");
  } else {
    autoTable(doc, {
      ...tableTheme(),
      startY: 60,
      head: [["Assignment", "Subject", "Status", "Priority", "Due Date"]],
      body: rows,
    });
  }
  saveReport(doc, `assignments-${slug(profile)}.pdf`);
}

// ------------------ Timetable ------------------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function generateTimetableReport(
  profile: Profile | null,
  entries: Timetable[],
  subjects: Subject[],
) {
  const doc = new jsPDF();
  drawHeader(doc, "Weekly Timetable", profile);
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const rows = [...entries]
    .sort((a, b) => {
      const d = DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week);
      return d !== 0 ? d : a.start_time.localeCompare(b.start_time);
    })
    .map((e) => {
      const s = subjectsById.get(e.subject_id);
      return [
        e.day_of_week,
        `${e.start_time.slice(0, 5)} - ${e.end_time.slice(0, 5)}`,
        s?.subject_name ?? "—",
        s?.faculty_name ?? "—",
        [e.room_number, e.building].filter(Boolean).join(", ") || "—",
      ];
    });
  drawSectionTitle(doc, 55, `Summary: ${entries.length} class slot(s) across the week`);
  if (rows.length === 0) {
    drawEmpty(doc, 65, "No timetable entries available.");
  } else {
    autoTable(doc, {
      ...tableTheme(),
      startY: 60,
      head: [["Day", "Time", "Subject", "Faculty", "Room"]],
      body: rows,
    });
  }
  saveReport(doc, `timetable-${slug(profile)}.pdf`);
}

// ------------------ Notes ------------------

export function generateNotesReport(
  profile: Profile | null,
  notes: Note[],
  subjects: Subject[],
) {
  const doc = new jsPDF();
  drawHeader(doc, "Notes Summary", profile);
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const totalBytes = notes.reduce((sum, n) => sum + (n.file_size || 0), 0);
  const mb = (totalBytes / (1024 * 1024)).toFixed(2);
  drawSectionTitle(doc, 55, `Summary: ${notes.length} file(s) • ${mb} MB total`);

  const rows = notes.map((n) => [
    subjectsById.get(n.subject_id)?.subject_name ?? "—",
    n.title,
    (n.file_type || "—").split("/")[1]?.toUpperCase() || n.file_type || "—",
    new Date(n.created_at).toLocaleDateString(),
  ]);
  if (rows.length === 0) {
    drawEmpty(doc, 65, "No notes uploaded yet.");
  } else {
    autoTable(doc, {
      ...tableTheme(),
      startY: 60,
      head: [["Subject", "Title", "Type", "Uploaded"]],
      body: rows,
    });
  }
  saveReport(doc, `notes-${slug(profile)}.pdf`);
}

// ------------------ Semester Summary ------------------

export function generateSemesterReport(
  profile: Profile | null,
  data: {
    subjects: Subject[];
    attendance: Attendance[];
    assignments: Assignment[];
    notes: Note[];
    timetableCount: number;
  },
) {
  const doc = new jsPDF();
  drawHeader(doc, "Semester Summary", profile);

  const { subjects, attendance, assignments, notes, timetableCount } = data;
  const overallTotal = attendance.reduce((s, a) => s + (a.total_classes || 0), 0);
  const overallAttended = attendance.reduce((s, a) => s + (a.classes_attended || 0), 0);
  const overallPct = overallTotal ? (overallAttended / overallTotal) * 100 : 0;
  const pending = assignments.filter((a) => a.status !== "Completed").length;

  autoTable(doc, {
    ...tableTheme(),
    startY: 55,
    head: [["Metric", "Value"]],
    body: [
      ["Subjects enrolled", String(subjects.length)],
      ["Weekly class slots", String(timetableCount)],
      ["Overall attendance", `${overallPct.toFixed(1)}%`],
      ["Assignments (total)", String(assignments.length)],
      ["Assignments pending", String(pending)],
      ["Study notes uploaded", String(notes.length)],
    ],
  });

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const attendanceRows = attendance.map((a) => [
    subjectsById.get(a.subject_id)?.subject_name ?? "—",
    `${a.classes_attended}/${a.total_classes}`,
    `${Number(a.attendance_percentage ?? 0).toFixed(1)}%`,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y1 = (doc as any).lastAutoTable?.finalY ?? 90;
  drawSectionTitle(doc, y1 + 12, "Attendance by subject");
  if (attendanceRows.length === 0) {
    drawEmpty(doc, y1 + 22, "No attendance records yet.");
  } else {
    autoTable(doc, {
      ...tableTheme(),
      startY: y1 + 16,
      head: [["Subject", "Classes", "Percentage"]],
      body: attendanceRows,
    });
  }
  saveReport(doc, `semester-summary-${slug(profile)}.pdf`);
}
