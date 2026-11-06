import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const facultyKeys = {
  stats: () => ["faculty", "stats"] as const,
  students: () => ["faculty", "students"] as const,
  mySubjects: () => ["faculty", "my-subjects"] as const,
  studentsInSubject: (key: string) => ["faculty", "students-in", key] as const,
  myNotes: () => ["faculty", "my-notes"] as const,
  myAssignments: () => ["faculty", "my-assignments"] as const,
  myAnnouncements: () => ["faculty", "my-announcements"] as const,
  myAttendanceHistory: (subject: string, date: string) =>
    ["faculty", "attendance-history", subject, date] as const,
};

export type FacultyStats = {
  assigned_subjects: number;
  total_students: number;
  assignments_created: number;
  notes_uploaded: number;
  announcements: number;
  upcoming_events: number;
};

export function facultyMyStatsQueryOptions() {
  return queryOptions({
    queryKey: facultyKeys.stats(),
    staleTime: 30_000,
    queryFn: async (): Promise<FacultyStats> => {
      const { data, error } = await supabase.rpc("faculty_my_stats" as never);
      if (error) throw error;
      return (data as unknown as FacultyStats) ?? {
        assigned_subjects: 0,
        total_students: 0,
        assignments_created: 0,
        notes_uploaded: 0,
        announcements: 0,
        upcoming_events: 0,
      };
    },
  });
}

export type MySubject = {
  subject_key: string;
  subject_code: string | null;
  subject_name: string;
  department: string | null;
  semester: number | null;
  student_count: number;
  sample_subject_id: string;
};

export function facultyMySubjectsQueryOptions() {
  return queryOptions({
    queryKey: facultyKeys.mySubjects(),
    staleTime: 30_000,
    queryFn: async (): Promise<MySubject[]> => {
      const { data, error } = await supabase.rpc("faculty_my_subjects" as never);
      if (error) throw error;
      return ((data as unknown as MySubject[]) ?? []).map((r) => ({
        ...r,
        student_count: Number(r.student_count ?? 0),
      }));
    },
  });
}

export type StudentInSubject = {
  student_id: string;
  full_name: string | null;
  email: string | null;
  branch: string | null;
  semester: number | null;
  subject_id: string;
};

export function facultyStudentsInSubjectQueryOptions(subjectKey: string | undefined) {
  return queryOptions({
    queryKey: subjectKey ? facultyKeys.studentsInSubject(subjectKey) : ["faculty", "students-in", "none"],
    enabled: !!subjectKey,
    staleTime: 15_000,
    queryFn: async (): Promise<StudentInSubject[]> => {
      const { data, error } = await supabase.rpc(
        "faculty_students_in_subject" as never,
        { _subject_key: subjectKey } as never,
      );
      if (error) throw error;
      return (data as unknown as StudentInSubject[]) ?? [];
    },
  });
}

export type FacultyStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  college_name: string | null;
  branch: string | null;
  semester: number | null;
};

export function facultyStudentsQueryOptions() {
  return queryOptions({
    queryKey: facultyKeys.students(),
    staleTime: 30_000,
    queryFn: async (): Promise<FacultyStudent[]> => {
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rErr) throw rErr;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, college_name, branch, semester")
        .in("id", ids)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data as FacultyStudent[]) ?? [];
    },
  });
}

// Kept for backward compatibility with older imports
export function facultyStatsQueryOptions() {
  return facultyMyStatsQueryOptions();
}
