import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Play, Trophy, CalendarClock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { studentQuizzesQuery, type StudentQuizRow } from "@/features/ai/queries";

export const Route = createFileRoute("/_authenticated/dashboard/quizzes/")({
  head: () => ({
    meta: [
      { title: "Quizzes — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data = [], isLoading } = useQuery(studentQuizzesQuery());
  const [tab, setTab] = useState("available");

  const now = Date.now();
  const groups = useMemo(() => {
    const available: StudentQuizRow[] = [];
    const upcoming: StudentQuizRow[] = [];
    const completed: StudentQuizRow[] = [];
    const expired: StudentQuizRow[] = [];
    for (const q of data) {
      const publishTs = q.publish_at ? new Date(q.publish_at).getTime() : 0;
      const dueTs = q.due_at ? new Date(q.due_at).getTime() : Infinity;
      if (publishTs > now) { upcoming.push(q); continue; }
      const attemptsLeft = q.attempts_allowed - (q.attempts_used ?? 0);
      if (dueTs < now) { expired.push(q); continue; }
      if (attemptsLeft <= 0 || (q.attempts_used ?? 0) > 0) { completed.push(q); continue; }
      available.push(q);
    }
    return { available, upcoming, completed, expired };
  }, [data, now]);

  return (
    <div className="space-y-6">
      <PageHeader title="Quizzes" description="View, take, and review quizzes assigned by your faculty." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="available">Available ({groups.available.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({groups.completed.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({groups.expired.length})</TabsTrigger>
        </TabsList>
        {(["available", "upcoming", "completed", "expired"] as const).map((kind) => (
          <TabsContent key={kind} value={kind} className="mt-4">
            <QuizList items={groups[kind]} kind={kind} loading={isLoading} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function QuizList({
  items, kind, loading,
}: { items: StudentQuizRow[]; kind: "available" | "upcoming" | "completed" | "expired"; loading: boolean }) {
  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>;
  if (items.length === 0) return <Card className="p-8 text-center text-sm text-muted-foreground">No quizzes here.</Card>;

  return (
    <div className="grid gap-3">
      {items.map((q) => {
        const pct = q.best_score != null && q.best_total ? Math.round((q.best_score / q.best_total) * 100) : null;
        return (
          <Card key={q.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="font-medium truncate">{q.title}</p>
              <p className="text-xs text-muted-foreground">
                {q.subject_label || "—"} · {q.difficulty} · {q.question_count} questions
                {q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ""}
                {q.faculty_name ? ` · by ${q.faculty_name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                {q.due_at && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Due {new Date(q.due_at).toLocaleString()}</span>}
                {q.attempts_allowed > 1 && <span>Attempts: {q.attempts_used ?? 0} / {q.attempts_allowed}</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pct !== null && <Badge variant="outline" className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {pct}%</Badge>}
              {q.last_status && <Badge variant="secondary" className="capitalize flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {q.last_status}</Badge>}
              {kind === "available" && (
                <Button size="sm" asChild>
                  <Link to="/dashboard/quizzes/$id" params={{ id: q.id }}><Play className="h-4 w-4 mr-1" /> Start</Link>
                </Button>
              )}
              {kind === "completed" && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/quizzes/$id" params={{ id: q.id }}>Review</Link>
                </Button>
              )}
              {kind === "upcoming" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Opens {new Date(q.publish_at!).toLocaleString()}</Badge>}
              {kind === "expired" && <Badge variant="outline">Closed</Badge>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}