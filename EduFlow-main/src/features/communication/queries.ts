import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event, Notification } from "./types";

export const communicationKeys = {
  announcements: () => ["announcements", "for-me"] as const,
  events: () => ["events"] as const,
  notifications: (uid: string) => ["notifications", uid] as const,
};

export type AnnouncementForMe = {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  audience_type: "College" | "Department" | "Semester" | "Subject";
  department_id: string | null;
  department_name: string | null;
  target_semester: number | null;
  catalog_subject_id: string | null;
  subject_name: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  publish_status: "Draft" | "Published" | "Archived";
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  is_pinned: boolean;
};

export const announcementsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? communicationKeys.announcements() : ["announcements", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<AnnouncementForMe[]> => {
      const { data, error } = await supabase.rpc("list_announcements_for_me");
      if (error) throw error;
      return (data ?? []) as AnnouncementForMe[];
    },
  });

export const eventsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? communicationKeys.events() : ["events", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const notificationsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? communicationKeys.notifications(uid) : ["notifications", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
