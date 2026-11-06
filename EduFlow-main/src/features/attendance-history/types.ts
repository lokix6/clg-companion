import type { Database } from "@/integrations/supabase/types";

export type AttendanceHistory = Database["public"]["Tables"]["attendance_history"]["Row"];
export type AttendanceHistoryInsert = Database["public"]["Tables"]["attendance_history"]["Insert"];
export type AttendanceStatusValue = "Present" | "Absent";
export const ATTENDANCE_STATUSES: AttendanceStatusValue[] = ["Present", "Absent"];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
}
