import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const attnKeys = {
  facultyCatalog: () => ["attn", "faculty", "catalog"] as const,
  facultyStudents: (subjectId: string) => ["attn", "faculty", "students", subjectId] as const,
  facultyMarks: (subjectId: string, date: string) =>
    ["attn", "faculty", "marks", subjectId, date] as const,
  facultyDashboard: () => ["attn", "faculty", "dashboard"] as const,
  studentSummary: () => ["attn", "student", "summary"] as const,
  studentRecent: (limit: number) => ["attn", "student", "recent", limit] as const,
  adminOverview: () => ["attn", "admin", "overview"] as const,
  adminReport: (f: Record<string, unknown>) => ["attn", "admin", "report", f] as const,
};

export type FacultyCatalogSubject = {
  id: string;
  subject_code: string | null;
  subject_name: string;
  semester: number | null;
  department_id: string | null;
  department_name: string | null;
  student_count: number;
};

export function facultyCatalogSubjectsQuery() {
  return queryOptions({
    queryKey: attnKeys.facultyCatalog(),
    staleTime: 30_000,
    queryFn: async (): Promise<FacultyCatalogSubject[]> => {
      const { data, error } = await supabase.rpc("faculty_catalog_subjects" as never);
      if (error) throw error;
      return ((data as unknown as FacultyCatalogSubject[]) ?? []).map((r) => ({
        ...r,
        student_count: Number(r.student_count ?? 0),
      }));
    },
  });
}

export type FacultyCatalogStudent = {
  student_id: string;
  full_name: string | null;
  email: string | null;
  roll_number: string | null;
  branch: string | null;
  semester: number | null;
};

export function facultyCatalogStudentsQuery(subjectId: string | undefined) {
  return queryOptions({
    queryKey: subjectId ? attnKeys.facultyStudents(subjectId) : ["attn", "faculty", "students", "none"],
    enabled: !!subjectId,
    staleTime: 15_000,
    queryFn: async (): Promise<FacultyCatalogStudent[]> => {
      const { data, error } = await supabase.rpc(
        "faculty_catalog_students" as never,
        { _catalog_subject_id: subjectId } as never,
      );
      if (error) throw error;
      return (data as unknown as FacultyCatalogStudent[]) ?? [];
    },
  });
}

export function facultyMarksForDateQuery(subjectId: string | undefined, date: string) {
  return queryOptions({
    queryKey: subjectId ? attnKeys.facultyMarks(subjectId, date) : ["attn", "faculty", "marks", "none"],
    enabled: !!subjectId && !!date,
    staleTime: 5_000,
    queryFn: async (): Promise<Record<string, "Present" | "Absent">> => {
      const { data, error } = await supabase.rpc(
        "faculty_catalog_attendance_for_date" as never,
        { _catalog_subject_id: subjectId, _date: date } as never,
      );
      if (error) throw error;
      const map: Record<string, "Present" | "Absent"> = {};
      for (const r of (data as { student_id: string; status: string }[] | null) ?? []) {
        map[r.student_id] = (r.status as "Present" | "Absent") ?? "Present";
      }
      return map;
    },
  });
}

export type FacultyDashboardAttn = {
  assigned_subjects: number;
  attendance_completed_today: number;
  attendance_pending_today: number;
  total_students: number;
  recent_sessions: Array<{
    class_date: string;
    subject_name: string;
    catalog_subject_id: string;
    present: number;
    total: number;
  }>;
};

export function facultyDashboardAttnQuery() {
  return queryOptions({
    queryKey: attnKeys.facultyDashboard(),
    staleTime: 30_000,
    queryFn: async (): Promise<FacultyDashboardAttn> => {
      const { data, error } = await supabase.rpc("faculty_attendance_dashboard" as never);
      if (error) throw error;
      return (data as unknown as FacultyDashboardAttn) ?? {
        assigned_subjects: 0,
        attendance_completed_today: 0,
        attendance_pending_today: 0,
        total_students: 0,
        recent_sessions: [],
      };
    },
  });
}

export type StudentSubjectSummary = {
  catalog_subject_id: string;
  subject_code: string | null;
  subject_name: string | null;
  total_classes: number;
  present_count: number;
  absent_count: number;
  percentage: number;
};

export function studentSummaryQuery() {
  return queryOptions({
    queryKey: attnKeys.studentSummary(),
    staleTime: 15_000,
    queryFn: async (): Promise<StudentSubjectSummary[]> => {
      const { data, error } = await supabase.rpc("student_attendance_summary" as never);
      if (error) throw error;
      return ((data as unknown as StudentSubjectSummary[]) ?? []).map((r) => ({
        ...r,
        total_classes: Number(r.total_classes ?? 0),
        present_count: Number(r.present_count ?? 0),
        absent_count: Number(r.absent_count ?? 0),
        percentage: Number(r.percentage ?? 0),
      }));
    },
  });
}

export type StudentRecentRow = {
  id: string;
  class_date: string;
  subject_code: string | null;
  subject_name: string | null;
  status: "Present" | "Absent";
  marked_at: string;
};

export function studentRecentQuery(limit = 50) {
  return queryOptions({
    queryKey: attnKeys.studentRecent(limit),
    staleTime: 15_000,
    queryFn: async (): Promise<StudentRecentRow[]> => {
      const { data, error } = await supabase.rpc(
        "student_attendance_recent" as never,
        { _limit: limit } as never,
      );
      if (error) throw error;
      return (data as unknown as StudentRecentRow[]) ?? [];
    },
  });
}

export type AdminAttnOverview = {
  overall_percentage: number;
  total_records: number;
  by_department: Array<{ id: string; name: string; total: number; present: number; pct: number }>;
  by_faculty: Array<{ id: string; name: string; total: number; present: number; pct: number }>;
  by_subject: Array<{
    id: string;
    subject_code: string | null;
    subject_name: string;
    total: number;
    present: number;
    pct: number;
  }>;
  low_attendance_students: Array<{
    id: string;
    name: string;
    email: string;
    branch: string | null;
    semester: number | null;
    total: number;
    present: number;
    pct: number;
  }>;
};

export function adminOverviewQuery() {
  return queryOptions({
    queryKey: attnKeys.adminOverview(),
    staleTime: 30_000,
    queryFn: async (): Promise<AdminAttnOverview> => {
      const { data, error } = await supabase.rpc("admin_attendance_overview" as never);
      if (error) throw error;
      return (data as unknown as AdminAttnOverview) ?? {
        overall_percentage: 0,
        total_records: 0,
        by_department: [],
        by_faculty: [],
        by_subject: [],
        low_attendance_students: [],
      };
    },
  });
}

export type AdminReportFilters = {
  department_id?: string;
  semester?: number;
  catalog_subject_id?: string;
  faculty_id?: string;
  student_id?: string;
  from?: string;
  to?: string;
};

export type AdminReportRow = {
  id: string;
  class_date: string;
  student_id: string;
  student_name: string | null;
  catalog_subject_id: string;
  subject_code: string | null;
  subject_name: string | null;
  faculty_id: string | null;
  faculty_name: string | null;
  department_id: string | null;
  department_name: string | null;
  semester: number | null;
  status: "Present" | "Absent";
};

export function adminReportQuery(filters: AdminReportFilters) {
  return queryOptions({
    queryKey: attnKeys.adminReport(filters),
    staleTime: 15_000,
    queryFn: async (): Promise<AdminReportRow[]> => {
      const { data, error } = await supabase.rpc("admin_attendance_report" as never, {
        _department_id: filters.department_id ?? null,
        _semester: filters.semester ?? null,
        _catalog_subject_id: filters.catalog_subject_id ?? null,
        _faculty_id: filters.faculty_id ?? null,
        _student_id: filters.student_id ?? null,
        _from: filters.from ?? null,
        _to: filters.to ?? null,
      } as never);
      if (error) throw error;
      return (data as unknown as AdminReportRow[]) ?? [];
    },
  });
}
