import type { Attendance } from "./types";
import type { Subject } from "@/features/academic/types";

export type AttendanceAnalytics = {
  overall: number;
  average: number;
  highest: { subjectName: string; percent: number } | null;
  lowest: { subjectName: string; percent: number } | null;
  belowThreshold: Array<{ id: string; subjectName: string; percent: number }>;
};

export function computeAnalytics(
  records: Attendance[],
  subjectsById: Map<string, Subject>,
): AttendanceAnalytics {
  if (records.length === 0) {
    return { overall: 0, average: 0, highest: null, lowest: null, belowThreshold: [] };
  }
  const totalAttended = records.reduce((s, r) => s + r.classes_attended, 0);
  const totalClasses = records.reduce((s, r) => s + r.total_classes, 0);
  const overall = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 0;
  const avg =
    records.reduce((s, r) => s + Number(r.attendance_percentage), 0) / records.length;
  const average = Math.round(avg * 10) / 10;

  const sorted = [...records].sort(
    (a, b) => Number(b.attendance_percentage) - Number(a.attendance_percentage),
  );
  const top = sorted[0];
  const bot = sorted[sorted.length - 1];
  const nameOf = (subjectId: string) =>
    subjectsById.get(subjectId)?.subject_name ?? "Unknown subject";

  return {
    overall,
    average,
    highest: top
      ? { subjectName: nameOf(top.subject_id), percent: Number(top.attendance_percentage) }
      : null,
    lowest: bot
      ? { subjectName: nameOf(bot.subject_id), percent: Number(bot.attendance_percentage) }
      : null,
    belowThreshold: records
      .filter((r) => Number(r.attendance_percentage) < 75)
      .map((r) => ({
        id: r.id,
        subjectName: nameOf(r.subject_id),
        percent: Number(r.attendance_percentage),
      })),
  };
}
