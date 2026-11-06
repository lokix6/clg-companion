import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Flame,
  Play,
  Target,
  Trophy,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  chunkSets,
  difficultyOfSet,
  EASY_COUNT,
  HARD_COUNT,
  MEDIUM_COUNT,
  QUESTIONS_PER_SET,
  TOTAL_SETS,
  type AptitudeDifficulty,
} from "@/features/aptitude/data";
import {
  bestAttemptPerSet,
  computeLongestStreak,
  computeStreakDays,
  hasAttemptToday,
  useAptitudeAttempts,
} from "@/features/aptitude/queries";

export const Route = createFileRoute("/_authenticated/dashboard/aptitude/")({
  component: AptitudePage,
});

const DIFF_META: Record<
  AptitudeDifficulty,
  { label: string; dot: string; ring: string; text: string; badge: string; total: number }
> = {
  easy: {
    label: "Easy",
    dot: "bg-emerald-500",
    ring: "border-emerald-500/30 bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    badge:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    total: EASY_COUNT,
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    ring: "border-amber-500/30 bg-amber-500/5",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    total: MEDIUM_COUNT,
  },
  hard: {
    label: "Hard",
    dot: "bg-rose-500",
    ring: "border-rose-500/30 bg-rose-500/5",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
    total: HARD_COUNT,
  },
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AptitudePage() {
  const navigate = useNavigate();
  const { data: attempts = [], isLoading } = useAptitudeAttempts();
  const best = useMemo(() => bestAttemptPerSet(attempts), [attempts]);

  const completedSetNumbers = useMemo(() => new Set(best.keys()), [best]);
  const totalCompleted = completedSetNumbers.size;

  const averageScore = useMemo(() => {
    const bests = Array.from(best.values());
    if (bests.length === 0) return 0;
    return bests.reduce((s, a) => s + a.score, 0) / bests.length;
  }, [best]);

  const highest = useMemo(() => {
    let hi = 0;
    for (const a of best.values()) if (a.score > hi) hi = a.score;
    return hi;
  }, [best]);

  const streak = useMemo(() => computeStreakDays(attempts), [attempts]);
  const longestStreak = useMemo(() => computeLongestStreak(attempts), [attempts]);
  const doneToday = useMemo(() => hasAttemptToday(attempts), [attempts]);

  const completedByDifficulty = useMemo(() => {
    const counts: Record<AptitudeDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const n of completedSetNumbers) counts[difficultyOfSet(n)] += 1;
    return counts;
  }, [completedSetNumbers]);

  // Find first unattempted set to launch "Start Today's Set"
  const nextSetNumber = useMemo(() => {
    for (let n = 1; n <= TOTAL_SETS; n++) if (!completedSetNumbers.has(n)) return n;
    return 1;
  }, [completedSetNumbers]);

  const chunks = useMemo(() => chunkSets(10), []);
  const [openChunk, setOpenChunk] = useState<string | null>(chunks[0]?.label ?? null);

  // Progress tab stats
  const recentAttempts = useMemo(() => attempts.slice(0, 10), [attempts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Aptitude & Reasoning Practice"
        description="Practice placement aptitude questions daily to improve logical reasoning, quantitative aptitude, verbal ability, and interview readiness."
        actions={
          <Button
            onClick={() =>
              navigate({
                to: "/dashboard/aptitude/$setNumber",
                params: { setNumber: String(nextSetNumber) },
              })
            }
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Start Today's Set
          </Button>
        }
      />

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Flame className="h-4 w-4" />
          </div>
          <p className="text-sm">
            {attempts.length === 0 ? (
              <>
                🔥 <span className="font-semibold">0 Day Streak</span> — complete your
                first aptitude set to start your streak.
              </>
            ) : doneToday ? (
              <>
                🔥 <span className="font-semibold">{streak} Day Streak</span> — today's
                aptitude goal completed ✓
              </>
            ) : streak > 0 ? (
              <>
                🔥 <span className="font-semibold">{streak} Day Streak</span> — complete
                1 set today to keep your streak alive.
              </>
            ) : (
              <>
                🔥 <span className="font-semibold">0 Day Streak</span> — complete a set
                today to start a new streak.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="practice" className="space-y-6">
        <TabsList>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Completed"
              value={`${totalCompleted} / ${TOTAL_SETS}`}
              sub="Total sets attempted"
              icon={CheckCircle2}
            />
            <StatCard
              label="Average"
              value={`${averageScore.toFixed(1)} / ${QUESTIONS_PER_SET}`}
              sub="Across best attempts"
              icon={Trophy}
            />
            <StatCard
              label="Current Streak"
              value={`${streak} ${streak === 1 ? "Day" : "Days"}`}
              sub="Keep it going"
              icon={Flame}
            />
            <StatCard
              label="Best Score"
              value={`${highest} / ${QUESTIONS_PER_SET}`}
              sub="Highest so far"
              icon={Target}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(Object.keys(DIFF_META) as AptitudeDifficulty[]).map((diff) => {
              const meta = DIFF_META[diff];
              const done = completedByDifficulty[diff];
              const pct = meta.total ? (done / meta.total) * 100 : 0;
              return (
                <Card key={diff} className={cn("border", meta.ring)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                        <div className={cn("text-sm font-semibold", meta.text)}>
                          {meta.label}
                        </div>
                      </div>
                      <Badge variant="outline" className={meta.badge}>
                        {done}/{meta.total}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <Progress value={pct} className="h-2" />
                      <div className="mt-2 text-xs text-muted-foreground">
                        {pct.toFixed(0)}% complete
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            {chunks.map((chunk) => {
              const isOpen = openChunk === chunk.label;
              const doneInChunk = chunk.sets.filter((s) =>
                completedSetNumbers.has(s.setNumber),
              ).length;
              return (
                <Card key={chunk.label}>
                  <button
                    type="button"
                    onClick={() => setOpenChunk(isOpen ? null : chunk.label)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold">{chunk.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {doneInChunk} of {chunk.sets.length} completed
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <CardContent className="border-t pt-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {chunk.sets.map((s) => {
                          const meta = DIFF_META[s.difficulty];
                          const attempt = best.get(s.setNumber);
                          const completed = !!attempt;
                          return (
                            <Link
                              key={s.setNumber}
                              to="/dashboard/aptitude/$setNumber"
                              params={{ setNumber: String(s.setNumber) }}
                              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-elegant"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">
                                  Set {s.setNumber}
                                </div>
                                <Badge variant="outline" className={meta.badge}>
                                  {meta.label}
                                </Badge>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {s.category}
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {QUESTIONS_PER_SET} Questions
                                </span>
                                {completed ? (
                                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {attempt!.score}/{attempt!.total}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <Circle className="h-3.5 w-3.5" />
                                    Not Attempted
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Current Streak"
              value={`${streak} ${streak === 1 ? "Day" : "Days"}`}
              sub={doneToday ? "Today completed ✓" : "Complete a set today"}
              icon={Flame}
            />
            <StatCard
              label="Longest Streak"
              value={`${longestStreak} ${longestStreak === 1 ? "Day" : "Days"}`}
              sub="Best consecutive run"
              icon={Trophy}
            />
            <StatCard
              label="Sets Completed"
              value={`${totalCompleted} / ${TOTAL_SETS}`}
              sub={`${((totalCompleted / TOTAL_SETS) * 100).toFixed(0)}% overall`}
              icon={CheckCircle2}
            />
            <StatCard
              label="Average Score"
              value={`${averageScore.toFixed(1)}/${QUESTIONS_PER_SET}`}
              sub={`${attempts.length} total attempts`}
              icon={Target}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Difficulty-wise Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(DIFF_META) as AptitudeDifficulty[]).map((diff) => {
                const meta = DIFF_META[diff];
                const done = completedByDifficulty[diff];
                const pct = meta.total ? (done / meta.total) * 100 : 0;
                return (
                  <div key={diff}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                        <span className="font-medium">{meta.label}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {done}/{meta.total} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attempts yet. Start your first set to see progress here.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentAttempts.map((a) => {
                    const meta = DIFF_META[a.difficulty];
                    const pct = (a.score / a.total) * 100;
                    return (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            Set {a.set_number}
                            <Badge variant="outline" className={meta.badge}>
                              {meta.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.category} ·{" "}
                            {new Date(a.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <Progress value={pct} className="h-2" />
                          </div>
                          <div className="w-16 text-right text-sm font-semibold">
                            {a.score}/{a.total}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
