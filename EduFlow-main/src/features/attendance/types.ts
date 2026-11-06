import type { Database } from "@/integrations/supabase/types";

export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type AttendanceInsert = Database["public"]["Tables"]["attendance"]["Insert"];

export type AttendanceStatus = "good" | "warning" | "danger";

export function attendanceStatus(pct: number): AttendanceStatus {
  if (pct >= 75) return "good";
  if (pct >= 60) return "warning";
  return "danger";
}
