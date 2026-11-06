import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FiltersSchema = z.object({
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
});

export type AiUsageRow = {
  user: string;
  title: string;
  module: string;
  created_at: string;
};

export type AiUsageResponse = {
  kpis: {
    totalConversations: number;
    totalMessages: number;
    uniqueUsers: number;
    avgMessagesPerConversation: number;
    summariesGenerated: number;
    studyPlansGenerated: number;
    aiQuizzesGenerated: number;
    mostUsedFeature: string;
    mostActiveUser: string;
    avgPromptLength: number;
    avgResponseLength: number;
    longestConversation: number;
  };
  byModule: { name: string; value: number }[];
  daily: { name: string; value: number }[];
  weekly: { name: string; value: number }[];
  monthly: { name: string; value: number }[];
  conversationsPerDay: { name: string; value: number }[];
  topUsers: { user: string; conversations: number; messages: number }[];
  promptCategories: { name: string; value: number }[];
  rows: AiUsageRow[];
};

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function categorize(text: string): string {
  const t = text.toLowerCase();
  if (/\b(assignment|homework|submission)\b/.test(t)) return "Assignments";
  if (/\b(note|summary|summarize|summari[sz]e)\b/.test(t)) return "Notes";
  if (/\b(placement|interview|resume|cv|internship)\b/.test(t)) return "Placement";
  if (/\b(code|program|python|java|c\+\+|javascript|algorithm|debug|function|loop|array)\b/.test(t)) return "Programming";
  if (/\b(exam|syllabus|semester|marks|study|lecture|subject|topic|concept|theorem|equation)\b/.test(t)) return "Academic";
  return "General";
}

export const getAiUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => FiltersSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    // Verify admin (uses caller RLS)
    const { data: isAdminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const from = data.date_from || null;
    const to = data.date_to || null;

    let cq = supabaseAdmin
      .from("ai_conversations")
      .select("id, user_id, title, module, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (from) cq = cq.gte("created_at", from);
    if (to) cq = cq.lte("created_at", to);
    const { data: conversations, error: cErr } = await cq;
    if (cErr) throw cErr;
    const convs = conversations ?? [];
    const convIds = convs.map((c) => c.id);

    let mq = supabaseAdmin
      .from("ai_messages")
      .select("conversation_id, user_id, role, content, created_at")
      .limit(50000);
    if (convIds.length) mq = mq.in("conversation_id", convIds);
    else mq = mq.eq("conversation_id", "00000000-0000-0000-0000-000000000000");
    if (from) mq = mq.gte("created_at", from);
    if (to) mq = mq.lte("created_at", to);
    const { data: msgs } = await mq;
    const messages = msgs ?? [];

    let sq = supabaseAdmin.from("note_summaries").select("id, user_id, created_at").limit(10000);
    if (from) sq = sq.gte("created_at", from);
    if (to) sq = sq.lte("created_at", to);
    const { data: summaries } = await sq;

    let pq = supabaseAdmin.from("study_plans").select("id, user_id, created_at").limit(10000);
    if (from) pq = pq.gte("created_at", from);
    if (to) pq = pq.lte("created_at", to);
    const { data: plans } = await pq;

    let qq = supabaseAdmin.from("ai_quizzes").select("id, created_by, created_at").limit(10000);
    if (from) qq = qq.gte("created_at", from);
    if (to) qq = qq.lte("created_at", to);
    const { data: quizzes } = await qq;

    const userIds = Array.from(
      new Set([
        ...convs.map((c) => c.user_id).filter((v): v is string => !!v),
        ...messages.map((m) => m.user_id).filter((v): v is string => !!v),
      ]),
    );
    const profMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      for (const p of profs ?? []) profMap.set(p.id, p.full_name || p.email || "Unknown");
    }

    const totalConversations = convs.length;
    const totalMessages = messages.length;
    const uniqueUsers = new Set(convs.map((c) => c.user_id).filter(Boolean)).size;
    const avgMessagesPerConversation =
      totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

    const byModuleMap = new Map<string, number>();
    for (const c of convs) {
      const key = c.module || "assistant";
      byModuleMap.set(key, (byModuleMap.get(key) ?? 0) + 1);
    }
    byModuleMap.set("summarizer", (byModuleMap.get("summarizer") ?? 0) + (summaries?.length ?? 0));
    byModuleMap.set("planner", (byModuleMap.get("planner") ?? 0) + (plans?.length ?? 0));
    byModuleMap.set("quiz-generator", (byModuleMap.get("quiz-generator") ?? 0) + (quizzes?.length ?? 0));
    const byModule = [...byModuleMap.entries()]
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const mostUsedFeature = byModule[0]?.name ?? "—";

    const convByUser = new Map<string, number>();
    for (const c of convs) if (c.user_id) convByUser.set(c.user_id, (convByUser.get(c.user_id) ?? 0) + 1);
    const msgByUser = new Map<string, number>();
    for (const m of messages) if (m.user_id) msgByUser.set(m.user_id, (msgByUser.get(m.user_id) ?? 0) + 1);
    const topUsers = [...convByUser.entries()]
      .map(([uid, c]) => ({ user: profMap.get(uid) ?? "Unknown", conversations: c, messages: msgByUser.get(uid) ?? 0 }))
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10);
    const mostActiveUser = topUsers[0]?.user ?? "—";

    // Prompt/response lengths
    let promptLen = 0, promptN = 0, respLen = 0, respN = 0;
    for (const m of messages) {
      const len = (m.content ?? "").length;
      if (m.role === "user") { promptLen += len; promptN += 1; }
      else if (m.role === "assistant") { respLen += len; respN += 1; }
    }
    const avgPromptLength = promptN ? Math.round(promptLen / promptN) : 0;
    const avgResponseLength = respN ? Math.round(respLen / respN) : 0;

    // Longest conversation
    const msgsByConv = new Map<string, number>();
    for (const m of messages) msgsByConv.set(m.conversation_id, (msgsByConv.get(m.conversation_id) ?? 0) + 1);
    const longestConversation = msgsByConv.size ? Math.max(...msgsByConv.values()) : 0;

    // Prompt categorization (user messages only)
    const catMap = new Map<string, number>();
    for (const m of messages) {
      if (m.role !== "user") continue;
      const c = categorize(m.content ?? "");
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const promptCategories = [...catMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Time series
    const dayMap = new Map<string, number>();
    const cDayMap = new Map<string, number>();
    const weekMap = new Map<string, number>();
    const monthMap = new Map<string, number>();
    for (const m of messages) {
      const d = m.created_at.slice(0, 10);
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      const dt = new Date(m.created_at);
      const w = isoWeek(dt);
      weekMap.set(w, (weekMap.get(w) ?? 0) + 1);
      const mo = m.created_at.slice(0, 7);
      monthMap.set(mo, (monthMap.get(mo) ?? 0) + 1);
    }
    for (const c of convs) {
      const d = c.created_at.slice(0, 10);
      cDayMap.set(d, (cDayMap.get(d) ?? 0) + 1);
    }
    const toSeries = (m: Map<string, number>, take: number) =>
      [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-take).map(([name, value]) => ({ name, value }));

    const daily = toSeries(dayMap, 30).map((p) => ({ name: p.name.slice(5), value: p.value }));
    const weekly = toSeries(weekMap, 12);
    const monthly = toSeries(monthMap, 12);
    const conversationsPerDay = toSeries(cDayMap, 30).map((p) => ({ name: p.name.slice(5), value: p.value }));

    const rows: AiUsageRow[] = convs.map((c) => ({
      user: (c.user_id && profMap.get(c.user_id)) || "Unknown",
      title: c.title || "Untitled",
      module: c.module || "assistant",
      created_at: c.created_at,
    }));

    const response: AiUsageResponse = {
      kpis: {
        totalConversations,
        totalMessages,
        uniqueUsers,
        avgMessagesPerConversation,
        summariesGenerated: summaries?.length ?? 0,
        studyPlansGenerated: plans?.length ?? 0,
        aiQuizzesGenerated: quizzes?.length ?? 0,
        mostUsedFeature,
        mostActiveUser,
        avgPromptLength,
        avgResponseLength,
        longestConversation,
      },
      byModule,
      daily,
      weekly,
      monthly,
      conversationsPerDay,
      topUsers,
      promptCategories,
      rows,
    };
    return response;
  });
