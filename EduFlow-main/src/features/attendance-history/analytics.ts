import type { AttendanceHistory } from "./types";

export type RunningPoint = {
  id: string;
  date: string;
  subjectId: string | null;
  status: "Present" | "Absent";
  attended: number;
  total: number;
  percent: number;
};

/**
 * Compute a running attendance percentage per subject over time.
 * Returns entries in chronological (ascending) order enriched with running totals.
 */
export function computeRunningHistory(records: AttendanceHistory[]): RunningPoint[] {
  const sorted = [...records].sort((a, b) => {
    const cmp = a.class_date.localeCompare(b.class_date);
    if (cmp !== 0) return cmp;
    return a.created_at.localeCompare(b.created_at);
  });
  const counters = new Map<string, { attended: number; total: number }>();
  return sorted.map((r) => {
    const cur = counters.get(r.subject_id ?? "") ?? { attended: 0, total: 0 };
    cur.total += 1;
    if (r.status === "Present") cur.attended += 1;
    counters.set(r.subject_id ?? "", cur);
    return {
      id: r.id,
      date: r.class_date,
      subjectId: r.subject_id,
      status: r.status as "Present" | "Absent",
      attended: cur.attended,
      total: cur.total,
      percent: cur.total ? Math.round((cur.attended / cur.total) * 1000) / 10 : 0,
    };
  });
}

export type OverallPoint = { date: string; percent: number; attended: number; total: number };

/** Overall attendance trend across all subjects, aggregated day-by-day. */
export function computeOverallTrend(records: AttendanceHistory[]): OverallPoint[] {
  const byDate = new Map<string, { attended: number; total: number }>();
  for (const r of records) {
    const cur = byDate.get(r.class_date) ?? { attended: 0, total: 0 };
    cur.total += 1;
    if (r.status === "Present") cur.attended += 1;
    byDate.set(r.class_date, cur);
  }
  const dates = [...byDate.keys()].sort();
  let attended = 0;
  let total = 0;
  return dates.map((d) => {
    const day = byDate.get(d)!;
    attended += day.attended;
    total += day.total;
    return {
      date: d,
      attended,
      total,
      percent: total ? Math.round((attended / total) * 1000) / 10 : 0,
    };
  });
}

export type HistoryStats = {
  totalClasses: number;
  present: number;
  absent: number;
  currentPercent: number;
  monthPercent: number;
};

export function computeHistoryStats(records: AttendanceHistory[], monthKeyStr?: string): HistoryStats {
  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = total - present;
  const currentPercent = total ? Math.round((present / total) * 1000) / 10 : 0;
  const monthRecs = monthKeyStr
    ? records.filter((r) => r.class_date.startsWith(monthKeyStr))
    : records;
  const monthTotal = monthRecs.length;
  const monthPresent = monthRecs.filter((r) => r.status === "Present").length;
  const monthPercent = monthTotal ? Math.round((monthPresent / monthTotal) * 1000) / 10 : 0;
  return { totalClasses: total, present, absent, currentPercent, monthPercent };
}
