import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { LabAttempt, LabDataset, LabQuestion } from "./types";

export function useLabQuestions() {
  return useQuery({
    queryKey: ["lab-questions"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<LabQuestion[]> => {
      const { data, error } = await supabase
        .from("lab_questions")
        .select(
          "id, question_number, topic, difficulty, title, statement, dataset_key, expected_output, expected_ordered, hint, solution",
        )
        .order("question_number");
      if (error) throw error;
      return (data ?? []) as unknown as LabQuestion[];
    },
  });
}

export function useLabDataset(datasetKey: string | undefined) {
  return useQuery({
    queryKey: ["lab-dataset", datasetKey ?? "none"],
    enabled: !!datasetKey,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<LabDataset | null> => {
      const { data, error } = await supabase
        .from("lab_datasets")
        .select("id, key, name, description, setup_sql")
        .eq("key", datasetKey!)
        .maybeSingle();
      if (error) throw error;
      return (data as LabDataset | null) ?? null;
    },
  });
}

export function useLabAttempts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lab-attempts", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<LabAttempt[]> => {
      const { data, error } = await supabase.from("lab_attempts").select("*");
      if (error) throw error;
      return (data ?? []) as LabAttempt[];
    },
  });
}

interface RecordAttemptInput {
  questionId: string;
  sql: string;
  solved: boolean;
}

export function useRecordLabAttempt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, sql, solved }: RecordAttemptInput) => {
      if (!user) throw new Error("Not signed in");
      const existing = (queryClient.getQueryData(["lab-attempts", user.id]) as LabAttempt[] | undefined) ?? [];
      const prev = existing.find((a) => a.question_id === questionId);
      const alreadySolved = prev?.status === "solved";
      const status = alreadySolved || solved ? "solved" : "attempted";
      const { error } = await supabase.from("lab_attempts").upsert(
        {
          user_id: user.id,
          question_id: questionId,
          last_sql: sql,
          status,
          attempts: (prev?.attempts ?? 0) + 1,
          solved_at: alreadySolved ? prev?.solved_at : solved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,question_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-attempts"] });
    },
  });
}
