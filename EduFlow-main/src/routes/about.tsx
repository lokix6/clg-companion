import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, AlertCircle, Sparkles, Heart, Users, ShieldCheck, Zap } from "lucide-react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ABOUT_TITLE = "About — EduFlow";
const ABOUT_DESC =
  "EduFlow's mission, vision, and the story behind the smart campus platform for students.";

const faqs = [
  { q: "Is EduFlow free?", a: "Yes — the student MVP is free. Advanced modules will be optional add-ons." },
  { q: "Which colleges are supported?", a: "EduFlow works with any college. Institution-level integrations roll out gradually." },
  { q: "Do you sell my data?", a: "Never. Your data is private and encrypted at rest and in transit." },
  { q: "When will AI features launch?", a: "AI Assistant, PDF Analysis and Quiz Generator are on the roadmap after v1." },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: ABOUT_TITLE },
      { name: "description", content: ABOUT_DESC },
      { property: "og:title", content: ABOUT_TITLE },
      { property: "og:description", content: ABOUT_DESC },
      { property: "og:url", content: "https://campus-flow-hq.lovable.app/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://campus-flow-hq.lovable.app/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: Heart, title: "Student-first", desc: "Every decision is filtered through student needs." },
  { icon: ShieldCheck, title: "Trust & Privacy", desc: "Your data is yours. Always encrypted, never sold." },
  { icon: Zap, title: "Speed & Simplicity", desc: "Fast interfaces that respect your time." },
  { icon: Users, title: "Community", desc: "Built with students, colleges, and educators." },
];

const timeline = [
  { year: "2024", title: "Idea", desc: "Frustrated with juggling apps, we sketched EduFlow." },
  { year: "2025", title: "First prototype", desc: "Rolled out to 3 colleges as a pilot." },
  { year: "2026", title: "Public launch", desc: "CollegeCompanion v1 goes live for all students." },
  { year: "Next", title: "AI Assistant", desc: "Smart study tools built directly into your workspace." },
];


function AboutPage() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-hero py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="outline" className="mb-4">About EduFlow</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The smart campus platform, <span className="text-gradient">built for students</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            EduFlow (CollegeCompanion) is a modern, minimal workspace that unifies the tools students
            need to run their academic life — without the noise.
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            { icon: Target, title: "Our Mission", desc: "To give every student a calm, unified place to run their academic life." },
            { icon: Eye, title: "Our Vision", desc: "Become the operating system of student life across every college." },
            { icon: AlertCircle, title: "The Problem", desc: "Students switch between WhatsApp, Google Drive, spreadsheets, and portals daily." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Why EduFlow</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">A modern workspace for modern students</h2>
            <p className="mt-4 text-muted-foreground">
              Notion-clean. Linear-fast. Stripe-polished. Designed to feel premium and stay out of
              your way.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Our Values</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">What we stand for</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary/10 text-secondary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">Timeline</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Our journey</h2>
          </div>
          <div className="mt-12 space-y-4">
            {timeline.map((t, i) => (
              <div key={t.year} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:flex sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t.year}</div>
                    <div className="mt-0.5 text-base font-semibold">{t.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t.desc}</div>
                  </div>
                </div>
                <Sparkles className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border/60 bg-card px-4 shadow-card data-[state=open]:shadow-elegant [&:not(:last-child)]:mb-3">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingLayout>
  );
}
