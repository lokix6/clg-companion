import type { Database } from "@/integrations/supabase/types";

export type AssignmentReminder = Database["public"]["Tables"]["assignment_reminders"]["Row"];
export type AssignmentReminderInsert = Database["public"]["Tables"]["assignment_reminders"]["Insert"];
export type ReminderTypeEnum = Database["public"]["Enums"]["reminder_type"];

export const REMINDER_TYPES: ReminderTypeEnum[] = [
  "1 day before",
  "3 days before",
  "7 days before",
  "Custom",
];

export function computeReminderDate(dueDate: string, type: ReminderTypeEnum): string {
  const due = new Date(dueDate);
  const days = type === "1 day before" ? 1 : type === "3 days before" ? 3 : type === "7 days before" ? 7 : 0;
  due.setDate(due.getDate() - days);
  const year = due.getFullYear();
  const month = String(due.getMonth() + 1).padStart(2, "0");
  const day = String(due.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type ReminderStatus = "Upcoming" | "Due Today" | "Overdue" | "Completed";

export function reminderStatus(dueDate: string, assignmentStatus: string): ReminderStatus {
  if (assignmentStatus === "Completed") return "Completed";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return "Due Today";
  if (due.getTime() < today.getTime()) return "Overdue";
  return "Upcoming";
}
