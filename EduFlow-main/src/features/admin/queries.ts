import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Announcement, Event } from "@/features/communication/types";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  students: (filters?: unknown) => [...adminKeys.all, "students", filters ?? "all"] as const,
  subjects: () => [...adminKeys.all, "subjects"] as const,
  departments: () => [...adminKeys.all, "departments"] as const,
  facultyOptions: () => [...adminKeys.all, "faculty-options"] as const,
  announcements: () => [...adminKeys.all, "announcements"] as const,
  events: () => [...adminKeys.all, "events"] as const,
  activity: (limit = 20) => [...adminKeys.all, "activity", limit] as const,
  attendanceTrend: () => [...adminKeys.all, "attendance-trend"] as const,
};

export type AdminStats = {
  total_students: number;
  active_students: number;
  inactive_students: number;
  total_subjects: number;
  total_assignments: number;
  completed_assignments: number;
  total_attendance_records: number;
  average_attendance: number;
  total_notes: number;
  total_announcements: number;
  total_events: number;
  upcoming_events: number;
  unread_notifications: number;
  recent_registrations: number;
};

export const adminStatsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.stats(),
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("admin_platform_stats");
      if (error) throw error;
      return data as unknown as AdminStats;
    },
    staleTime: 30_000,
  });

export type AdminStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  college_name: string | null;
  branch: string | null;
  department: string | null;
  semester: number | null;
  avatar_url: string | null;
  status: "active" | "inactive" | "deleted";
  created_at: string;
  role: string | null;
};

export const adminStudentsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.students(),
    queryFn: async (): Promise<AdminStudent[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, college_name, branch, department, semester, avatar_url, status, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));

      return (profiles ?? []).map((p) => ({
        ...(p as Omit<AdminStudent, "role">),
        role: roleMap.get(p.id) ?? "student",
      }));
    },
  });

// -------------------------------- Departments --------------------------------

export type AdminDepartment = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: "active" | "inactive";
  subject_count: number;
  faculty_count: number;
  student_count: number;
  created_at: string;
};

export const adminDepartmentsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.departments(),
    queryFn: async (): Promise<AdminDepartment[]> => {
      const { data, error } = await supabase.rpc("admin_department_stats" as never);
      if (error) throw error;
      return ((data as unknown as AdminDepartment[]) ?? []).map((r) => ({
        ...r,
        subject_count: Number(r.subject_count ?? 0),
        faculty_count: Number(r.faculty_count ?? 0),
        student_count: Number(r.student_count ?? 0),
      }));
    },
    staleTime: 15_000,
  });

// ------------------------------- Faculty options -----------------------------

export type FacultyOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
};

export const adminFacultyOptionsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.facultyOptions(),
    queryFn: async (): Promise<FacultyOption[]> => {
      const { data, error } = await supabase.rpc("admin_faculty_options" as never);
      if (error) throw error;
      return (data as unknown as FacultyOption[]) ?? [];
    },
    staleTime: 60_000,
  });

// -------------------------------- Subjects (catalog) -------------------------

export type AdminSubject = {
  id: string;
  subject_name: string;
  subject_code: string | null;
  description: string | null;
  faculty_id: string | null;
  faculty_name: string | null;
  faculty_email: string | null;
  semester: number | null;
  credits: number | null;
  status: "active" | "inactive";
  department_id: string | null;
  department_name: string | null;
  created_at: string;
};

export const adminSubjectsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.subjects(),
    queryFn: async (): Promise<AdminSubject[]> => {
      const { data, error } = await supabase.rpc("admin_catalog_subjects" as never);
      if (error) throw error;
      return (data as unknown as AdminSubject[]) ?? [];
    },
    staleTime: 15_000,
  });

export type AdminActivity = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const adminActivityQueryOptions = (limit = 20) =>
  queryOptions({
    queryKey: adminKeys.activity(limit),
    queryFn: async (): Promise<AdminActivity[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AdminActivity[];
    },
  });

export const adminAttendanceTrendQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.attendanceTrend(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_history")
        .select("class_date, status")
        .gte("class_date", new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
        .order("class_date", { ascending: true });
      if (error) throw error;
      const map = new Map<string, { date: string; present: number; total: number }>();
      (data ?? []).forEach((r) => {
        const key = r.class_date;
        const cur = map.get(key) ?? { date: key, present: 0, total: 0 };
        cur.total += 1;
        if (r.status === "Present") cur.present += 1;
        map.set(key, cur);
      });
      return Array.from(map.values()).map((r) => ({
        date: r.date,
        percentage: r.total === 0 ? 0 : Math.round((r.present / r.total) * 100),
      }));
    },
  });

export const adminAnnouncementsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.announcements(),
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

export const adminEventsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.events(),
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });
