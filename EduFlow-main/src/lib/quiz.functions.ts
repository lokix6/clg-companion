import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- Update quiz metadata / questions / delete ---------- */
export const updateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        quizId: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        topic: z.string().max(500).nullable().optional(),
        subject_label: z.string().max(200).nullable().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        questions: z.array(z.record(z.string(), z.unknown())).optional(),
        show_correct_answers: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      title?: string;
      topic?: string | null;
      subject_label?: string | null;
      difficulty?: "easy" | "medium" | "hard";
      questions?: unknown;
      question_count?: number;
      show_correct_answers?: boolean;
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.topic !== undefined) patch.topic = data.topic;
    if (data.subject_label !== undefined) patch.subject_label = data.subject_label;
    if (data.difficulty !== undefined) patch.difficulty = data.difficulty;
    if (data.show_correct_answers !== undefined) patch.show_correct_answers = data.show_correct_answers;
    if (data.questions) {
      patch.questions = data.questions;
      patch.question_count = data.questions.length;
    }
    const { error } = await context.supabase
      .from("ai_quizzes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.quizId)
      .eq("created_by", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_quizzes")
      .delete()
      .eq("id", data.quizId)
      .eq("created_by", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Faculty: create a quiz manually (no AI) ---------- */
const ManualQuestion = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    question: z.string().min(1).max(2000),
    options: z.array(z.string().min(1).max(500)).min(2).max(6),
    answer_index: z.number().int().min(0).max(5),
    explanation: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("true_false"),
    question: z.string().min(1).max(2000),
    answer: z.boolean(),
    explanation: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("short"),
    question: z.string().min(1).max(2000),
    answer: z.string().max(2000).default(""),
  }),
  z.object({
    type: z.literal("long"),
    question: z.string().min(1).max(4000),
    answer: z.string().max(4000).default(""),
  }),
]);

export const createManualQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        subject_label: z.string().max(200).nullable().optional(),
        topic: z.string().max(500).nullable().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        time_limit_minutes: z.number().int().min(1).max(600).nullable().optional(),
        questions: z.array(ManualQuestion).min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    for (const q of data.questions) {
      if (q.type === "mcq" && q.answer_index >= q.options.length) {
        throw new Error(`"${q.question.slice(0, 40)}" has no correct option selected`);
      }
    }
    const { data: row, error } = await context.supabase
      .from("ai_quizzes")
      .insert({
        created_by: context.userId,
        title: data.title,
        subject_label: data.subject_label ?? null,
        topic: data.topic ?? null,
        difficulty: data.difficulty,
        question_count: data.questions.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: data.questions as any,
        time_limit_minutes: data.time_limit_minutes ?? null,
        status: "draft",
        is_published: false,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create quiz");
    return { ok: true, quizId: row.id };
  });

/* ---------- Assign / publish a quiz ---------- */
const AssignInput = z.object({
  quizId: z.string().uuid(),
  catalog_subject_id: z.string().uuid().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  section_id: z.string().uuid().nullable().optional(),
  publish_at: z.string().datetime().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  time_limit_minutes: z.number().int().min(1).max(600).nullable().optional(),
  attempts_allowed: z.number().int().min(1).max(10).default(1),
  shuffle_questions: z.boolean().default(false),
  randomize_options: z.boolean().default(false),
  show_correct_answers: z.boolean().default(true),
  target_student_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(["draft", "assigned"]).default("assigned"),
});

export const assignQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership check
    const { data: quiz, error: qErr } = await supabase
      .from("ai_quizzes")
      .select("id, created_by, status")
      .eq("id", data.quizId)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quiz) throw new Error("Quiz not found");
    if (quiz.created_by !== userId) throw new Error("Not authorized");

    // Update quiz record (avoid tripping the notification trigger on unchanged status)
    const patch: Record<string, unknown> = {
      catalog_subject_id: data.catalog_subject_id ?? null,
      department_id: data.department_id ?? null,
      semester: data.semester ?? null,
      section_id: data.section_id ?? null,
      publish_at: data.publish_at ?? null,
      due_at: data.due_at ?? null,
      time_limit_minutes: data.time_limit_minutes ?? null,
      attempts_allowed: data.attempts_allowed,
      shuffle_questions: data.shuffle_questions,
      randomize_options: data.randomize_options,
      show_correct_answers: data.show_correct_answers,
      status: data.status,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await supabase.from("ai_quizzes").update(patch as any).eq("id", data.quizId);
    if (upErr) throw new Error(upErr.message);

    // Replace targeted assignments
    await supabase.from("quiz_assignments").delete().eq("quiz_id", data.quizId);
    if (data.target_student_ids.length > 0) {
      const rows = data.target_student_ids.map((sid) => ({
        quiz_id: data.quizId,
        student_id: sid,
      }));
      const { error: aErr } = await supabase.from("quiz_assignments").insert(rows);
      if (aErr) throw new Error(aErr.message);
    }
    return { ok: true, status: data.status };
  });

/* ---------- Student: start / submit attempt ---------- */
export const startQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify entitlement using an authenticated RPC (returns boolean only —
    // never exposes questions or answer keys to the client).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entitled, error: entErr } = await (supabase.rpc as any)("student_quiz_entitled", { _quiz_id: data.quizId });
    if (entErr) throw new Error(entErr.message);
    if (!entitled) throw new Error("Quiz not available");

    // Fetch quiz data server-side with admin client (bypasses RLS) so we can
    // sanitize answer keys before anything leaves this handler.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q, error } = await supabaseAdmin
      .from("ai_quizzes")
      .select("id, status, attempts_allowed, due_at, questions")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!q) throw new Error("Quiz not available");
    if (q.status !== "assigned") throw new Error("Quiz is not open");
    if (q.due_at && new Date(q.due_at) < new Date()) throw new Error("Quiz has expired");

    const { count } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", data.quizId)
      .eq("student_id", userId);
    const attemptNo = (count ?? 0) + 1;
    if (attemptNo > (q.attempts_allowed ?? 1)) throw new Error("No attempts remaining");

    const rawQuestions = Array.isArray(q.questions) ? (q.questions as Array<Record<string, unknown>>) : [];
    const sanitized = rawQuestions.map((qq) => {
      const { answer_index: _ai, answer: _a, explanation: _e, correct_answer: _ca, correct_index: _ci, ...safe } = qq;
      void _ai; void _a; void _e; void _ca; void _ci;
      return safe as Record<string, unknown>;
    });
    return { ok: true, attemptNo, questions: sanitized as unknown as Array<Record<string, string | number | boolean | null>> };
  });



export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        quizId: z.string().uuid(),
        // answers: array indexed to questions; each is { type, value }
        answers: z.array(z.record(z.string(), z.unknown())),
        started_at: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify entitlement (boolean only, no answer keys returned).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entitled, error: entErr } = await (supabase.rpc as any)("student_quiz_entitled", { _quiz_id: data.quizId });
    if (entErr) throw new Error(entErr.message);
    if (!entitled) throw new Error("Quiz not found");

    // Grade server-side with admin client so answer keys never touch the wire.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q, error } = await supabaseAdmin
      .from("ai_quizzes")
      .select("id, questions, attempts_allowed, status")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!q) throw new Error("Quiz not found");
    if (q.status !== "assigned") throw new Error("Quiz not open");

    const questions = (q.questions as Array<Record<string, unknown>>) ?? [];

    const total = questions.length;
    let autoScore = 0;
    let autoGradable = 0;
    let manualPending = false;
    const graded = data.answers.map((ans, i) => {
      const qq = questions[i] ?? {};
      const type = String(qq.type ?? "mcq");
      if (type === "mcq") {
        autoGradable++;
        const correct = Number(qq.answer_index);
        const given = typeof ans.value === "number" ? ans.value : null;
        const ok = given !== null && given === correct;
        if (ok) autoScore++;
        // Never persist the answer key inside the attempt row: students can read
        // their own attempts directly, which would leak correct answers.
        return { ...ans, correct: ok };
      }
      if (type === "true_false") {
        autoGradable++;
        const correct = Boolean(qq.answer);
        const given = typeof ans.value === "boolean" ? ans.value : null;
        const ok = given !== null && given === correct;
        if (ok) autoScore++;
        return { ...ans, correct: ok };
      }
      manualPending = true;
      return { ...ans, needs_review: true };
    });

    const { count } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", data.quizId)
      .eq("student_id", userId);
    const attemptNo = (count ?? 0) + 1;
    if (attemptNo > (q.attempts_allowed ?? 1)) throw new Error("No attempts remaining");

    // Scores are computed here and written with the admin client: RLS-side
    // triggers reject student-supplied score fields, so self-reported scores
    // are impossible even if the client calls the table directly.
    const { data: row, error: insErr } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quizId,
        student_id: userId,
        answers: graded,
        auto_score: autoScore,
        score: manualPending ? null : autoScore,
        total,
        status: manualPending ? "submitted" : "graded",
        started_at: data.started_at ?? new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        attempt_no: attemptNo,
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "Failed to save attempt");
    return {
      ok: true,
      attemptId: row.id,
      autoScore,
      autoGradable,
      total,
      needsReview: manualPending,
    };
  });

/* ---------- Faculty: grade an attempt ---------- */
export const gradeQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        attemptId: z.string().uuid(),
        manual_score: z.number().min(0),
        feedback: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("quiz_attempts")
      .update({
        manual_score: data.manual_score,
        score: data.manual_score,
        feedback: data.feedback ?? null,
        status: "graded",
        graded_by: userId,
        graded_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
