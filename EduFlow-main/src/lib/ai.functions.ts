import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STUDENT_SYSTEM_PROMPT,
  FACULTY_SYSTEM_PROMPT,
  ASSIGNMENT_HELP_PROMPT,
  NOTE_SUMMARIZER_PROMPT,
  QUIZ_GENERATOR_PROMPT,
  STUDY_PLANNER_PROMPT,
} from "./ai/prompts";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const AI_MODEL = "google/gemini-2.5-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type FilePart = { type: "file"; file: { filename: string; file_data: string } };
type ContentPart = TextPart | ImagePart | FilePart;

type ChatMsg = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

async function callAi(opts: {
  system: string;
  messages: ChatMsg[];
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service is not configured on the server.");

  const messages = [
    { role: "system", content: opts.system },
    ...opts.messages.filter((m) => m.role !== "system"),
  ];

  const body: Record<string, unknown> = {
    model: AI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`AI service error [${res.status}]: ${txt.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("AI returned an empty response.");
  return text;
}

async function assertRateLimit(supabase: {
  from: (t: string) => {
    select: (c: string, o?: unknown) => {
      eq: (a: string, b: string) => {
        gte: (a: string, b: string) => Promise<{ count: number | null; error: unknown }>;
      };
    };
  };
}, userId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= 20) {
    throw new Error("You are sending requests too fast. Please wait a minute.");
  }
}

/* ---------- Attachments ---------- */
const AttachmentSchema = z.object({
  name: z.string().max(300),
  mime: z.string().max(200),
  size: z.number().int().nonnegative(),
  kind: z.enum(["image", "pdf", "text"]),
  base64: z.string().optional(),
  text: z.string().max(200_000).optional(),
  storagePath: z.string().optional(),
});
export type AiAttachment = z.infer<typeof AttachmentSchema>;

function buildUserContent(message: string, attachments: AiAttachment[]): string | ContentPart[] {
  if (!attachments.length) return message;
  const parts: ContentPart[] = [];
  const textChunks: string[] = [];
  if (message.trim()) textChunks.push(message);
  for (const a of attachments) {
    if (a.kind === "image" && a.base64) {
      parts.push({ type: "image_url", image_url: { url: `data:${a.mime};base64,${a.base64}` } });
    } else if (a.kind === "pdf" && a.base64) {
      parts.push({
        type: "file",
        file: { filename: a.name, file_data: `data:application/pdf;base64,${a.base64}` },
      });
    } else if (a.kind === "text" && a.text) {
      const clipped = a.text.slice(0, 60_000);
      textChunks.push(`\n\n--- Document: ${a.name} ---\n${clipped}${a.text.length > 60_000 ? "\n[truncated]" : ""}`);
    }
  }
  parts.unshift({ type: "text", text: textChunks.join("\n") || "Analyze the attached file(s)." });
  return parts;
}

/* ---------- Chat ---------- */
const ChatInput = z.object({
  conversationId: z.string().uuid().nullable(),
  module: z.enum(["assistant", "assignment_help", "summarizer", "quiz", "planner"]).default("assistant"),
  roleContext: z.enum(["student", "faculty"]).default("student"),
  subjectId: z.string().uuid().nullable().optional(),
  title: z.string().max(120).optional(),
  message: z.string().max(6000).default(""),
  attachments: z.array(AttachmentSchema).max(10).default([]),
});

export const aiChatSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.message.trim() && data.attachments.length === 0) {
      throw new Error("Message or attachment is required.");
    }
    await assertRateLimit(supabase as never, userId);

    let conversationId = data.conversationId;
    if (!conversationId) {
      const seed = data.message.slice(0, 60) || data.attachments[0]?.name || "New chat";
      const { data: conv, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          module: data.module,
          role_context: data.roleContext,
          subject_id: data.subjectId ?? null,
          title: data.title ?? seed,
        })
        .select("id")
        .single();
      if (error || !conv) throw new Error(error?.message ?? "Failed to create conversation");
      conversationId = conv.id;
    }

    const { data: prior } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    const history: ChatMsg[] = (prior ?? []).map((m) => ({
      role: m.role as ChatMsg["role"],
      content: m.content as string,
    }));

    const attachmentsLabel = data.attachments.length
      ? `\n\n[Attached ${data.attachments.length} file(s): ${data.attachments.map((a) => a.name).join(", ")}]`
      : "";
    const userTextForDb = (data.message || "Analyze the attached file(s).") + attachmentsLabel;

    history.push({ role: "user", content: buildUserContent(data.message, data.attachments) });

    const { data: userMsg } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: userTextForDb,
      })
      .select("id")
      .single();

    // Persist file records tied to this message
    if (data.attachments.length && userMsg?.id) {
      const rows = data.attachments.map((a) => ({
        user_id: userId,
        conversation_id: conversationId,
        message_id: userMsg.id,
        file_name: a.name,
        mime_type: a.mime,
        file_size: a.size,
        storage_path: a.storagePath ?? "",
        extracted_text: a.kind === "text" ? (a.text ?? "").slice(0, 100_000) : null,
      }));
      await supabase.from("ai_uploaded_files").insert(rows);
    }

    const system =
      data.module === "assignment_help"
        ? ASSIGNMENT_HELP_PROMPT
        : data.roleContext === "faculty"
        ? FACULTY_SYSTEM_PROMPT
        : STUDENT_SYSTEM_PROMPT;

    const answer = await callAi({ system, messages: history });

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: answer,
    });
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return { conversationId, reply: answer };
  });

/* ---------- Rename conversation ---------- */
export const aiRenameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_conversations")
      .update({ title: data.title })
      .eq("id", data.conversationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Delete conversation ---------- */
export const aiDeleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Notes Summarizer (accepts text, or a PDF file) ---------- */
const SummarizeInput = z
  .object({
    noteId: z.string().uuid().optional(),
    text: z.string().max(120_000).optional(),
    title: z.string().max(200).optional(),
    pdf: z
      .object({
        filename: z.string().min(1).max(300),
        base64: z.string().min(20),
      })
      .optional(),
  })
  .refine((v) => (v.text && v.text.trim().length >= 20) || v.pdf, {
    message: "Provide at least 20 characters of text or a PDF file.",
  });
export const aiSummarizeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertRateLimit(context.supabase as never, context.userId);
    const content: ContentPart[] = [
      {
        type: "text",
        text: data.pdf
          ? `Title: ${data.title ?? "Notes"}\n\nSummarize the attached PDF document.${
              data.text?.trim() ? `\n\nAdditional notes:\n${data.text}` : ""
            }`
          : `Title: ${data.title ?? "Notes"}\n\n${data.text}`,
      },
    ];
    if (data.pdf) {
      content.push({
        type: "file",
        file: {
          filename: data.pdf.filename,
          file_data: `data:application/pdf;base64,${data.pdf.base64}`,
        },
      });
    }
    const raw = await callAi({
      system: NOTE_SUMMARIZER_PROMPT,
      messages: [{ role: "user", content }],
      responseMimeType: "application/json",
      temperature: 0.4,
    });
    let parsed: Json;
    try {
      parsed = JSON.parse(raw) as Json;
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
    if (data.noteId) {
      await context.supabase
        .from("note_summaries")
        .upsert(
          { note_id: data.noteId, user_id: context.userId, summary: parsed },
          { onConflict: "note_id,user_id" },
        );
    }
    return { summary: parsed };
  });

/* ---------- Quiz Generator ---------- */
const QuizInput = z.object({
  title: z.string().min(1).max(200),
  subjectId: z.string().uuid().nullable().optional(),
  subjectLabel: z.string().max(200).optional(),
  topic: z.string().max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionCount: z.number().int().min(1).max(30).default(10),
  types: z.array(z.enum(["mcq", "true_false", "short", "long"])).min(1).default(["mcq"]),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
});
export const aiGenerateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertRateLimit(context.supabase as never, context.userId);
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const rset = new Set((roles ?? []).map((r) => r.role));
    if (!rset.has("faculty") && !rset.has("admin")) throw new Error("Only faculty or admins can generate quizzes.");

    const target = data.questionCount;
    const collected: Json[] = [];

    // The model sometimes returns fewer questions than requested — top up until we hit the target.
    for (let attempt = 0; attempt < 4 && collected.length < target; attempt++) {
      const remaining = target - collected.length;
      const existing = collected
        .map((q) => (q as { question?: string } | null)?.question)
        .filter(Boolean)
        .join(" | ");
      const prompt =
        `Generate exactly ${remaining} ${data.difficulty} questions on subject "${data.subjectLabel ?? ""}" topic "${data.topic ?? ""}". ` +
        `Include only these types: ${data.types.join(", ")}. Distribute evenly. Ensure factual accuracy. ` +
        `Return a JSON object {"questions": [...]} whose "questions" array has exactly ${remaining} items — no fewer.` +
        (existing ? ` Do NOT repeat any of these already-generated questions: ${existing.slice(0, 4000)}` : "");

      const raw = await callAi({
        system: QUIZ_GENERATOR_PROMPT,
        messages: [{ role: "user", content: prompt }],
        responseMimeType: "application/json",
        temperature: 0.6,
      });
      let chunk: { questions?: Json[] };
      try {
        chunk = JSON.parse(raw) as { questions?: Json[] };
      } catch {
        if (attempt === 0) throw new Error("AI returned invalid JSON. Please try again.");
        break;
      }
      if (!Array.isArray(chunk.questions) || chunk.questions.length === 0) {
        if (attempt === 0) throw new Error("AI returned no questions.");
        break;
      }
      collected.push(...chunk.questions);
    }

    if (collected.length === 0) throw new Error("AI returned no questions.");
    const parsed = { questions: collected.slice(0, target) };
    const { data: quiz, error } = await context.supabase
      .from("ai_quizzes")
      .insert({
        created_by: context.userId,
        title: data.title,
        subject_id: data.subjectId ?? null,
        subject_label: data.subjectLabel ?? null,
        topic: data.topic ?? null,
        difficulty: data.difficulty,
        question_count: parsed.questions.length,
        questions: parsed.questions,
        time_limit_minutes: data.timeLimitMinutes ?? null,
        is_published: true,
      })
      .select("id")
      .single();
    if (error || !quiz) throw new Error(error?.message ?? "Failed to save quiz");
    return { quizId: quiz.id, questions: parsed.questions };
  });

/* ---------- Study Planner ---------- */
export const aiGenerateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().max(120).optional(),
        topic: z.string().max(200).optional(),
        goals: z.string().max(2000).optional(),
        weeklyHours: z.number().int().min(1).max(80).default(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRateLimit(context.supabase as never, context.userId);
    const { supabase, userId } = context;

    const request = {
      plan_title: data.title ?? "",
      topic: data.topic ?? "",
      goals: data.goals ?? "",
      weekly_hours: data.weeklyHours,
    };

    const raw = await callAi({
      system: STUDY_PLANNER_PROMPT,
      messages: [
        {
          role: "user",
          content: `Create a personalized study plan using only the requirements in this JSON. Do not add department subjects or other academic data unless the student explicitly wrote them here.\nREQUEST JSON:\n${JSON.stringify(request)}`,
        },
      ],
      responseMimeType: "application/json",
      temperature: 0.5,
    });

    let parsed: Json;
    try {
      parsed = JSON.parse(raw) as Json;
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
    const { data: row, error } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        title: data.title ?? "My Study Plan",
        plan: parsed,
        goals: [data.topic?.trim() ? `Topic: ${data.topic.trim()}` : "", data.goals?.trim() ?? ""]
          .filter(Boolean)
          .join("\n") || null,
        weekly_hours: data.weeklyHours,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to save plan");
    return { planId: row.id, plan: parsed };
  });
