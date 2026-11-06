import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Database,
  FlaskConical,
  History,
  LineChart,
  Target,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard } from "@/components/dashboard/InfoCard";
import { useLabAttempts, useLabQuestions } from "@/features/lab/queries";
import { DifficultyBadge } from "@/features/lab/QuestionList";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({
    meta: [
      { title: "EduFlow Lab — Hands-on Practice" },
      {
        name: "description",
        content:
          "EduFlow Lab: hands-on practice labs for students, starting with a fully interactive SQL practice environment.",
      },
      { property: "og:title", content: "EduFlow Lab — Hands-on Practice" },
      {
        property: "og:description",
        content: "Practice SQL in a real, isolated PostgreSQL environment inside EduFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabDashboard,
});

const comingSoon = [
  { name: "Python Lab", icon: FlaskConical, blurb: "Write and run Python with instant feedback." },
  { name: "Statistics Lab", icon: BarChart3, blurb: "Explore datasets and statistical methods." },
  { name: "Power BI Lab", icon: LineChart, blurb: "Build dashboards and data stories." },
];

function LabDashboard() {
  const { data: questions = [] } = useLabQuestions();
  const { data: attempts = [] } = useLabAttempts();

  const solved = attempts.filter((a) => a.status === "solved").length;
  const attempted = attempts.length;
  const completion = questions.length > 0 ? Math.round((solved / questions.length) * 100) : 0;

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const recent = [...attempts]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((a) => ({ attempt: a, question: questionById.get(a.question_id) }))
    .filter((r) => r.question);

  const recommended = questions.find((q) => !attempts.some((a) => a.question_id === q.id && a.status === "solved"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="EduFlow Lab"
        description="Hands-on practice labs where you learn by doing. Start with SQL — more labs are on the way."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" /> Questions
          </div>
          <div className="mt-2 text-2xl font-bold">{questions.length}</div>
          <p className="text-xs text-muted-foreground">in the SQL question bank</p>
        </InfoCard>
        <InfoCard className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Solved
          </div>
          <div className="mt-2 text-2xl font-bold">{solved}</div>
          <p className="text-xs text-muted-foreground">questions completed</p>
        </InfoCard>
        <InfoCard className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CircleDashed className="h-3.5 w-3.5 text-amber-500" /> Attempted
          </div>
          <div className="mt-2 text-2xl font-bold">{attempted}</div>
          <p className="text-xs text-muted-foreground">questions started</p>
        </InfoCard>
        <InfoCard className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary" /> Completion
          </div>
          <div className="mt-2 text-2xl font-bold">{completion}%</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${completion}%` }} />
          </div>
        </InfoCard>
      </div>

      <div>
        <SectionHeader title="Available labs" description="Pick a lab and start practicing." />
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard className="flex flex-col p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold">SQL Lab</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              {questions.length} questions across 12 topics — from SELECT basics to subqueries and NULL
              handling — running on a real PostgreSQL engine in your browser.
            </p>
            <Link
              to="/lab/sql"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Open SQL Lab <ArrowRight className="h-4 w-4" />
            </Link>
          </InfoCard>

          {comingSoon.map((lab) => (
            <InfoCard key={lab.name} className="flex flex-col p-5 opacity-70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                <lab.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <h3 className="font-semibold">{lab.name}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coming soon
                </span>
              </div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{lab.blurb}</p>
            </InfoCard>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard>
          <SectionHeader title="Recent activity" description="Your latest practice sessions." />
          <div className="mt-3">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No practice activity yet — open the SQL Lab to get started.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map(({ attempt, question }) => (
                  <li key={attempt.id} className="flex items-center gap-3 py-2.5">
                    {attempt.status === "solved" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {question!.question_number}. {question!.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.status === "solved" ? "Solved" : "Attempted"} · {attempt.attempts} attempt
                        {attempt.attempts === 1 ? "" : "s"}
                      </div>
                    </div>
                    <DifficultyBadge difficulty={question!.difficulty} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InfoCard>

        <InfoCard>
          <SectionHeader title="Recommended practice" description="The next question for you to solve." />
          <div className="mt-3">
            {!recommended ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You've solved every question — amazing work!
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {recommended.topic}
                  </span>
                  <DifficultyBadge difficulty={recommended.difficulty} />
                </div>
                <div className="mt-2 font-semibold">
                  {recommended.question_number}. {recommended.title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{recommended.statement}</p>
                <Link
                  to="/lab/sql"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Start practicing <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
