import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportHistoryRow = {
  id: string;
  user_id: string;
  role: "admin" | "faculty" | "student";
  kind: string;
  name: string;
  format: "pdf" | "xlsx" | "csv";
  filters: Record<string, unknown>;
  row_count: number;
  generated_by_name: string | null;
  created_at: string;
};

export const reportHistoryKeys = {
  all: ["report_history"] as const,
  list: (role: string) => [...reportHistoryKeys.all, role] as const,
};

export function reportHistoryQuery(role: "admin" | "faculty" | "student") {
  return queryOptions({
    queryKey: reportHistoryKeys.list(role),
    queryFn: async (): Promise<ReportHistoryRow[]> => {
      const { data, error } = await supabase
        .from("report_history" as never)
        .select("*")
        .eq("role", role)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as ReportHistoryRow[]) ?? [];
    },
    staleTime: 15_000,
  });
}

export async function logReportHistory(input: {
  userId: string;
  role: "admin" | "faculty" | "student";
  kind: string;
  name: string;
  format: "pdf" | "xlsx" | "csv";
  filters: Record<string, unknown>;
  rowCount: number;
  generatedByName: string | null;
}): Promise<void> {
  await supabase.from("report_history" as never).insert({
    user_id: input.userId,
    role: input.role,
    kind: input.kind,
    name: input.name,
    format: input.format,
    filters: input.filters as never,
    row_count: input.rowCount,
    generated_by_name: input.generatedByName,
  } as never);
}

export async function deleteReportHistory(id: string): Promise<void> {
  const { error } = await supabase.from("report_history" as never).delete().eq("id", id);
  if (error) throw error;
}
