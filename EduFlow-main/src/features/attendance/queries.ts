import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Attendance } from "./types";

export const attendanceKeys = {
  all: (uid: string) => ["attendance", uid] as const,
};

export const attendanceQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? attendanceKeys.all(uid) : ["attendance", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Attendance[]> => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .order("attendance_percentage", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
