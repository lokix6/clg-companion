import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  FacultyAssignmentRow,
  FacultySubmissionRow,
  StudentAssignmentRow,
  FacultyCatalogSubject,
} from "./types";

export const assignmentKeys = {
  facultyList: () => ["assignments", "faculty", "list"] as const,
  facultySubmissions: (id: string) => ["assignments", "faculty", "submissions", id] as const,
  facultyDashboard: () => ["assignments", "faculty", "dashboard"] as const,
  studentList: () => ["assignments", "student", "list"] as const,
  adminOverview: () => ["assignments", "admin", "overview"] as const,
  facultyCatalog: () => ["assignments", "faculty", "catalog"] as const,
};

export function facultyAssignmentsQuery() {
  return queryOptions({
    queryKey: assignmentKeys.facultyList(),
    staleTime: 15_000,
    queryFn: async (): Promise<FacultyAssignmentRow[]> => {
      const { data, error } = await supabase.rpc("faculty_list_assignments" as never);
      if (error) throw error;
      return ((data as unknown as FacultyAssignmentRow[]) ?? []).map((r) => ({
        ...r,
        total_students: Number(r.total_students ?? 0),
        submission_count: Number(r.submission_count ?? 0),
        pending_review: Number(r.pending_review ?? 0),
        reviewed_count: Number(r.reviewed_count ?? 0),
      }));
    },
  });
}

export function facultySubmissionsQuery(assignmentId: string | null) {
  return queryOptions({
    queryKey: assignmentKeys.facultySubmissions(assignmentId ?? "none"),
    enabled: !!assignmentId,
    queryFn: async (): Promise<FacultySubmissionRow[]> => {
      const { data, error } = await supabase.rpc("faculty_list_submissions" as never, {
        _assignment_id: assignmentId,
      } as never);
      if (error) throw error;
      return (data as unknown as FacultySubmissionRow[]) ?? [];
    },
  });
}

export function facultyAssignmentDashboardQuery() {
  return queryOptions({
    queryKey: assignmentKeys.facultyDashboard(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("faculty_assignment_dashboard" as never);
      if (error) throw error;
      return data as unknown as {
        assignments_created: number;
        published: number;
        draft: number;
        total_submissions: number;
        pending_reviews: number;
        recent_submissions: Array<{
          id: string;
          submitted_at: string;
          review_status: string;
          title: string;
          student_name: string | null;
        }>;
      };
    },
  });
}

export function studentAssignmentsQuery() {
  return queryOptions({
    queryKey: assignmentKeys.studentList(),
    staleTime: 15_000,
    queryFn: async (): Promise<StudentAssignmentRow[]> => {
      const { data, error } = await supabase.rpc("student_list_assignments" as never);
      if (error) throw error;
      return (data as unknown as StudentAssignmentRow[]) ?? [];
    },
  });
}

export function adminAssignmentOverviewQuery() {
  return queryOptions({
    queryKey: assignmentKeys.adminOverview(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_assignment_overview" as never);
      if (error) throw error;
      return data as unknown as {
        total_assignments: number;
        total_submissions: number;
        pending_reviews: number;
        reviewed: number;
        by_department: Array<{
          id: string;
          name: string;
          assignments: number;
          submissions: number;
          pending: number;
        }>;
        by_faculty: Array<{
          id: string;
          name: string;
          assignments: number;
          submissions: number;
          pending: number;
        }>;
      };
    },
  });
}

export function facultyCatalogSubjectsQuery() {
  return queryOptions({
    queryKey: assignmentKeys.facultyCatalog(),
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
