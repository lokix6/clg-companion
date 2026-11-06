import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssignmentReminder } from "./types";

export const reminderKeys = {
  all: (uid: string) => ["assignment_reminders", uid] as const,
};

export const remindersQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? reminderKeys.all(uid) : ["assignment_reminders", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<AssignmentReminder[]> => {
      const { data, error } = await supabase
        .from("assignment_reminders")
        .select("*")
        .order("reminder_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
