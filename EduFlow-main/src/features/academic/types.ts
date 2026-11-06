import type { Database } from "@/integrations/supabase/types";

export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type SubjectInsert = Database["public"]["Tables"]["subjects"]["Insert"];
export type Timetable = Database["public"]["Tables"]["timetable"]["Row"];
export type TimetableInsert = Database["public"]["Tables"]["timetable"]["Insert"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];

export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"];
export type AssignmentPriority = Database["public"]["Enums"]["assignment_priority"];
export type DayOfWeek = Database["public"]["Enums"]["day_of_week"];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["Pending", "In Progress", "Completed"];
export const ASSIGNMENT_PRIORITIES: AssignmentPriority[] = ["Low", "Medium", "High"];

export function todayDayName(): DayOfWeek {
  return DAYS_OF_WEEK[(new Date().getDay() + 6) % 7];
}
