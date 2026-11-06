import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceHistory } from "./types";

export const attendanceHistoryKeys = {
  all: (uid: string) => ["attendance_history", uid] as const,
};

export const attendanceHistoryQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? attendanceHistoryKeys.all(uid) : ["attendance_history", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<AttendanceHistory[]> => {
      const { data, error } = await supabase
        .from("attendance_history")
        .select("*")
        .order("class_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
