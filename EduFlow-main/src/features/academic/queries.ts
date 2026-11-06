import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Assignment, Subject, Timetable } from "./types";

export const academicKeys = {
  subjects: (uid: string) => ["subjects", uid] as const,
  timetable: (uid: string) => ["timetable", uid] as const,
  assignments: (uid: string) => ["assignments", uid] as const,
};

export const subjectsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? academicKeys.subjects(uid) : ["subjects", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("subject_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const timetableQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? academicKeys.timetable(uid) : ["timetable", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Timetable[]> => {
      const { data, error } = await supabase
        .from("timetable")
        .select("*")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const assignmentsQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? academicKeys.assignments(uid) : ["assignments", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
