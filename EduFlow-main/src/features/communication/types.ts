import type { Database } from "@/integrations/supabase/types";

export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type AnnouncementCategory = Database["public"]["Enums"]["announcement_category"];
export type AnnouncementPriority = Database["public"]["Enums"]["announcement_priority"];
export type EventCategory = Database["public"]["Enums"]["event_category"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "Academic",
  "Examination",
  "Placement",
  "Workshop",
  "Holiday",
  "General",
];

export const ANNOUNCEMENT_PRIORITIES: AnnouncementPriority[] = ["High", "Medium", "Low"];

export const EVENT_CATEGORIES: EventCategory[] = [
  "Workshop",
  "Seminar",
  "Hackathon",
  "Placement Drive",
  "Cultural",
  "Sports",
  "General",
];

export function eventDateTime(e: Event): Date {
  const t = e.start_time ?? "00:00:00";
  return new Date(`${e.event_date}T${t}`);
}

export function isPastEvent(e: Event): boolean {
  const end = e.end_time ?? e.start_time ?? "23:59:59";
  return new Date(`${e.event_date}T${end}`).getTime() < Date.now();
}

export function isTodayEvent(e: Event): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return e.event_date === today;
}

export function formatEventTime(e: Event): string {
  if (!e.start_time) return "All day";
  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  return e.end_time ? `${fmt(e.start_time)} – ${fmt(e.end_time)}` : fmt(e.start_time);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
