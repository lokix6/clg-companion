import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const eventEditorKeys = {
  myEditableEvents: (uid: string) => ["event-editors", "mine", uid] as const,
  editorsForEvent: (eventId: string) => ["event-editors", "for-event", eventId] as const,
};

export type EventEditor = {
  id: string;
  event_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

export const myEditableEventIdsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? eventEditorKeys.myEditableEvents(uid) : ["event-editors", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("event_editors")
        .select("event_id")
        .eq("user_id", uid!);
      if (error) throw error;
      return (data ?? []).map((r) => r.event_id as string);
    },
  });

export const editorsForEventQuery = (eventId: string | undefined) =>
  queryOptions({
    queryKey: eventId ? eventEditorKeys.editorsForEvent(eventId) : ["event-editors", "anon-event"],
    enabled: !!eventId,
    queryFn: async (): Promise<EventEditor[]> => {
      const { data, error } = await supabase
        .from("event_editors")
        .select("id, event_id, user_id, granted_by, created_at, profiles:user_id(full_name, email)")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const p = (r as { profiles?: { full_name?: string; email?: string } }).profiles;
        return {
          id: r.id as string,
          event_id: r.event_id as string,
          user_id: r.user_id as string,
          granted_by: r.granted_by as string,
          created_at: r.created_at as string,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      });
    },
  });
