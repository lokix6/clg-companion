import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const aiKeys = {
  conversations: (userId: string) => ["ai", "conversations", userId] as const,
  messages: (conversationId: string) => ["ai", "messages", conversationId] as const,
  quizzes: () => ["ai", "quizzes"] as const,
  quiz: (id: string) => ["ai", "quiz", id] as const,
  studentQuizzes: () => ["ai", "student-quizzes"] as const,
  quizAttempts: (quizId: string) => ["ai", "quiz-attempts", quizId] as const,
  myQuizAttempts: (userId: string) => ["ai", "my-quiz-attempts", userId] as const,
  facultyAnalytics: () => ["ai", "faculty-quiz-analytics"] as const,
  adminAnalytics: () => ["ai", "admin-quiz-stats"] as const,
  plans: (userId: string) => ["ai", "plans", userId] as const,
  summary: (noteId: string, userId: string) => ["ai", "summary", noteId, userId] as const,
  studentQuizDetail: (id: string) => ["ai", "student-quiz-detail", id] as const,
};

export type AiConversation = {
  id: string;
  title: string;
  module: string;
  role_context: string;
  created_at: string;
  updated_at: string;
};
export type AiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export const conversationsQuery = (userId: string) =>
  queryOptions({
    queryKey: aiKeys.conversations(userId),
    queryFn: async (): Promise<AiConversation[]> => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, module, role_context, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AiConversation[];
    },
  });

export const messagesQuery = (conversationId: string | null) =>
  queryOptions({
    queryKey: aiKeys.messages(conversationId ?? "none"),
    enabled: !!conversationId,
    queryFn: async (): Promise<AiMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiMessage[];
    },
  });

export type AiQuiz = {
  id: string;
  title: string;
  topic: string | null;
  subject_label: string | null;
  difficulty: string;
  question_count: number;
  questions: unknown;
  created_by: string;
  created_at: string;
  status: string;
  department_id: string | null;
  semester: number | null;
  section_id: string | null;
  publish_at: string | null;
  due_at: string | null;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  randomize_options: boolean;
  show_correct_answers: boolean;
};

export const quizzesQuery = () =>
  queryOptions({
    queryKey: aiKeys.quizzes(),
    queryFn: async (): Promise<AiQuiz[]> => {
      const { data, error } = await supabase
        .from("ai_quizzes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AiQuiz[];
    },
  });

export const quizByIdQuery = (id: string) =>
  queryOptions({
    queryKey: aiKeys.quiz(id),
    queryFn: async (): Promise<AiQuiz | null> => {
      const { data, error } = await supabase
        .from("ai_quizzes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AiQuiz | null;
    },
  });

export type StudentQuizDetail = {
  id: string;
  title: string;
  topic: string | null;
  subject_label: string | null;
  difficulty: string;
  question_count: number;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  due_at: string | null;
  publish_at: string | null;
  status: string;
  shuffle_questions: boolean;
  randomize_options: boolean;
  questions: unknown;
};

export const studentQuizDetailQuery = (id: string) =>
  queryOptions({
    queryKey: aiKeys.studentQuizDetail(id),
    queryFn: async (): Promise<StudentQuizDetail | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("student_quiz_detail", { _quiz_id: id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as StudentQuizDetail | null;
    },
  });

export type StudentQuizRow = {
  id: string;
  title: string;
  subject_label: string | null;
  topic: string | null;
  difficulty: string;
  question_count: number;
  time_limit_minutes: number | null;
  due_at: string | null;
  publish_at: string | null;
  attempts_allowed: number;
  created_by: string;
  faculty_name: string | null;
  attempts_used: number;
  best_score: number | null;
  best_total: number | null;
  last_status: string | null;
};
export const studentQuizzesQuery = () =>
  queryOptions({
    queryKey: aiKeys.studentQuizzes(),
    queryFn: async (): Promise<StudentQuizRow[]> => {
      const { data, error } = await supabase.rpc("student_quiz_list");
      if (error) throw error;
      return (data ?? []) as unknown as StudentQuizRow[];
    },
  });

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: unknown;
  score: number | null;
  auto_score: number | null;
  manual_score: number | null;
  total: number | null;
  feedback: string | null;
  status: string;
  started_at: string;
  submitted_at: string;
  graded_at: string | null;
  attempt_no: number;
};

export const quizAttemptsQuery = (quizId: string) =>
  queryOptions({
    queryKey: aiKeys.quizAttempts(quizId),
    queryFn: async (): Promise<Array<QuizAttempt & { student_name: string | null }>> => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, profiles:student_id(full_name, email)")
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const p = (r as { profiles?: { full_name?: string; email?: string } }).profiles;
        return {
          ...(r as unknown as QuizAttempt),
          student_name: p?.full_name ?? p?.email ?? null,
        };
      });
    },
  });

export const myQuizAttemptsQuery = (userId: string, quizId: string) =>
  queryOptions({
    queryKey: [...aiKeys.myQuizAttempts(userId), quizId] as const,
    enabled: Boolean(userId && quizId),
    queryFn: async (): Promise<QuizAttempt[]> => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("student_id", userId)
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuizAttempt[];
    },
  });

export type FacultyQuizAnalytics = {
  total: number;
  assigned: number;
  draft: number;
  total_attempts: number;
  avg_score: number | null;
  max_score: number | null;
  min_score: number | null;
  per_quiz: Array<{ id: string; title: string; status: string; attempts: number; graded: number; avg_pct: number | null }>;
};
export const facultyQuizAnalyticsQuery = () =>
  queryOptions({
    queryKey: aiKeys.facultyAnalytics(),
    queryFn: async (): Promise<FacultyQuizAnalytics> => {
      const { data, error } = await supabase.rpc("faculty_quiz_analytics");
      if (error) throw error;
      return data as unknown as FacultyQuizAnalytics;
    },
  });

export type AdminQuizStats = {
  total_quizzes: number;
  assigned_quizzes: number;
  total_attempts: number;
  avg_score: number | null;
  by_department: Array<{ name: string; attempts: number; avg_pct: number | null }>;
  by_faculty: Array<{ name: string; quizzes: number; attempts: number; avg_pct: number | null }>;
};
export const adminQuizStatsQuery = () =>
  queryOptions({
    queryKey: aiKeys.adminAnalytics(),
    queryFn: async (): Promise<AdminQuizStats> => {
      const { data, error } = await supabase.rpc("admin_quiz_stats");
      if (error) throw error;
      return data as unknown as AdminQuizStats;
    },
  });

export type StudyPlan = {
  id: string;
  title: string;
  plan: unknown;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  goals: string | null;
  weekly_hours: number | null;
};
export const studyPlansQuery = (userId: string) =>
  queryOptions({
    queryKey: aiKeys.plans(userId),
    queryFn: async (): Promise<StudyPlan[]> => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("id, title, plan, created_at, updated_at, is_favorite, goals, weekly_hours")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudyPlan[];
    },
  });
