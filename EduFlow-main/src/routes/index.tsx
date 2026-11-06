import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  NotebookPen,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  UserPlus,
  LayoutDashboard,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

const HOME_TITLE = "EduFlow — One Platform for Every Student Need";
const HOME_DESC =
  "CollegeCompanion by EduFlow: manage assignments, attendance, notes, timetables, and campus updates from one beautiful dashboard.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: "https://campus-flow-hq.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://campus-flow-hq.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EduFlow",
          alternateName: "CollegeCompanion",
          url: "https://campus-flow-hq.lovable.app/",
          logo: "https://campus-flow-hq.lovable.app/favicon.ico",
          description: HOME_DESC,
        }),
      },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: ClipboardList, title: "Assignment Management", desc: "Track submissions, deadlines, and grades in one place." },
  { icon: CalendarCheck, title: "Attendance Tracker", desc: "Monitor subject-wise attendance with visual progress." },
  { icon: NotebookPen, title: "Notes Organizer", desc: "Structured notes by subject, unit, and topic." },
  { icon: BookOpen, title: "Timetable", desc: "Your weekly class schedule, always in your pocket." },
  { icon: Megaphone, title: "Campus Announcements", desc: "Never miss important notices from your college." },
  { icon: CalendarDays, title: "Events", desc: "Fests, workshops, and deadlines in a smart calendar." },
];

const benefits = [
  "Stay organized effortlessly",
  "Never miss a deadline again",
  "Everything you need in one place",
  "Built specifically for students",
];

const steps = [
  { icon: UserPlus, title: "Create Account", desc: "Sign up with your college email in seconds." },
  { icon: LayoutDashboard, title: "Access Dashboard", desc: "Your personalized workspace, ready to go." },
  { icon: Rocket, title: "Manage College Life", desc: "Assignments, attendance, notes — all sorted." },
];

const testimonials = [
  { name: "Aarav Sharma", role: "CSE, 3rd Year", quote: "EduFlow made my semester manageable. I stopped missing deadlines the week I signed up." },
  { name: "Priya Menon", role: "ECE, 2nd Year", quote: "The attendance tracker alone is worth it. Clean, fast, and actually built for students." },
  { name: "Rohan Iyer", role: "MBA, 1st Year", quote: "It replaced four apps for me. My notes, timetable, and campus updates now live in one place." },
];

function HomePage() {
  return (
    <MarketingLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-8 lg:pt-32">
          <div>
            <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Your complete campus companion
            </Badge>

            <h1 className="text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[4.25rem]">
              One platform for every <span className="text-gradient">student need.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Manage assignments, attendance, notes, schedules and campus updates from a single,
              beautifully organized dashboard — built for the way students actually study.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 rounded-xl bg-gradient-primary px-6 text-sm font-semibold shadow-elegant hover:opacity-95">
                <Link to="/signup">
                  Get started free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border/80 bg-card px-6 text-sm font-semibold">
                <Link to="/dashboard">View live demo</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> Free for students
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> No credit card
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> Setup in 60s
              </div>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="absolute -inset-8 rounded-[2rem] bg-gradient-primary opacity-20 blur-3xl" />
            <div className="relative rounded-2xl border border-border/70 bg-card p-3 shadow-elegant">
              <div className="flex items-center gap-1.5 px-2 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <div className="rounded-xl bg-background p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Welcome back</div>
                    <div className="truncate text-lg font-semibold tracking-tight">Aarav Sharma</div>
                  </div>
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Assignments", value: "12", tone: "bg-primary/10 text-primary" },
                    { label: "Attendance", value: "86%", tone: "bg-success/10 text-success" },
                    { label: "Classes today", value: "4", tone: "bg-secondary/10 text-secondary" },
                    { label: "Events", value: "3", tone: "bg-warning/10 text-warning" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border/70 p-3">
                      <div className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${s.tone}`}>
                        {s.label}
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-border/70 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Subject attendance</div>
                  <div className="mt-3 space-y-2.5">
                    {[
                      { s: "Data Structures", v: 92 },
                      { s: "Operating Systems", v: 78 },
                      { s: "DBMS", v: 88 },
                    ].map((r) => (
                      <div key={r.s}>
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{r.s}</span>
                          <span className="font-semibold">{r.v}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-primary" style={{ width: `${r.v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">Everything you need to run your semester</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Purpose-built modules that replace the ten apps you juggle today.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-t border-border/60 bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <Badge variant="outline" className="mb-4">Why EduFlow?</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">Built for the way students actually study.</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              We designed EduFlow with real students, not administrators. The result is a tool that
              fits into your day instead of adding to it.
            </p>
            <ul className="mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "10k+", v: "Active students" },
              { k: "120+", v: "Colleges" },
              { k: "98%", v: "Submission rate" },
              { k: "4.9★", v: "Student rating" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="text-3xl font-bold text-gradient">{s.k}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">Get started in three steps</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Step {i + 1}
                </div>
                <s.icon className="mt-3 h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/60 bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Loved by students</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">What students are saying</h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary" />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-hero px-6 py-14 text-center shadow-card sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Ready to take back control<br className="hidden sm:block" /> of your semester?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                Join thousands of students already organizing their college life with EduFlow.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="h-12 rounded-xl bg-gradient-primary px-6 text-sm font-semibold shadow-elegant hover:opacity-95">
                  <Link to="/signup">
                    Create your free account <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border/80 bg-card px-6 text-sm font-semibold">
                  <Link to="/dashboard">See a live demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
