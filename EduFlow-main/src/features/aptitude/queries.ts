import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { AptitudeCategory, AptitudeDifficulty } from "./data";

export type AptitudeAttempt = {
  id: string;
  user_id: string;
  set_number: number;
  difficulty: AptitudeDifficulty;
  category: AptitudeCategory;
  score: number;
  total: number;
  time_taken_seconds: number;
  answers: number[];
  created_at: string;
};

// Cast around not-yet-regenerated types.
const table = () => (supabase as unknown as { from: (t: string) => any }).from("aptitude_attempts");

export function useAptitudeAttempts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aptitude-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await table()
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AptitudeAttempt[];
    },
  });
}

export function useSaveAptitudeAttempt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      set_number: number;
      difficulty: AptitudeDifficulty;
      category: AptitudeCategory;
      score: number;
      total: number;
      time_taken_seconds: number;
      answers: number[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await table()
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AptitudeAttempt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aptitude-attempts"] });
    },
  });
}

// ---------- Derived stats ----------
// Local-calendar day key (YYYY-MM-DD) so a completion near midnight is
// attributed to the user's own calendar day, not UTC.
function localDayKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  return localDayKey(dt);
}

/**
 * Current streak in consecutive active local-calendar days.
 * - Multiple attempts on the same day count as ONE day.
 * - If the latest activity was today, streak includes today.
 * - If the latest activity was yesterday and today has no attempt yet,
 *   the streak is preserved (grace period until today ends).
 * - If the latest activity is older than yesterday, current streak = 0.
 */
export function computeStreakDays(attempts: AptitudeAttempt[]): number {
  if (attempts.length === 0) return 0;
  const days = new Set(attempts.map((a) => localDayKey(a.created_at)));
  const today = localDayKey(new Date());
  const yesterday = shiftDayKey(today, -1);
  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

/** Longest consecutive active-day sequence in the full history. */
export function computeLongestStreak(attempts: AptitudeAttempt[]): number {
  if (attempts.length === 0) return 0;
  const keys = Array.from(
    new Set(attempts.map((a) => localDayKey(a.created_at))),
  ).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === shiftDayKey(keys[i - 1], 1)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/** True if the user has already completed at least one set today. */
export function hasAttemptToday(attempts: AptitudeAttempt[]): boolean {
  const today = localDayKey(new Date());
  return attempts.some((a) => localDayKey(a.created_at) === today);
}

export function bestAttemptPerSet(attempts: AptitudeAttempt[]) {
  const map = new Map<number, AptitudeAttempt>();
  for (const a of attempts) {
    const prev = map.get(a.set_number);
    if (!prev || a.score > prev.score) map.set(a.set_number, a);
  }
  return map;
}
