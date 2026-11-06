import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { notifyContactMessage } from "@/lib/contact.functions";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_TITLE = "Contact — EduFlow";
const CONTACT_DESC =
  "Get in touch with the EduFlow team. Email, phone, or send a message — we usually reply within 24 hours.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: CONTACT_TITLE },
      { name: "description", content: CONTACT_DESC },
      { property: "og:title", content: CONTACT_TITLE },
      { property: "og:description", content: CONTACT_DESC },
      { property: "og:url", content: "https://campus-flow-hq.lovable.app/contact" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://campus-flow-hq.lovable.app/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EduFlow",
          url: "https://campus-flow-hq.lovable.app/",
          email: "umanagesh25@gmail.com",
          telephone: "+91-8790015394",
        }),
      },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
      return;
    }

    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("contact_messages")
      .insert(parsed.data)
      .select("id")
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      toast.error("Something went wrong. Please try again.");
      return;
    }

    try {
      await notifyContactMessage({
        data: { ...parsed.data, submissionId: inserted?.id ?? undefined },
      });
    } catch {
      // Message is saved; notification failures should not block the visitor.
    }
    setSubmitting(false);

    form.reset();
    toast.success("Your message has been sent successfully.");
  };

  const info = [
    { icon: Mail, label: "Email", value: "umanagesh25@gmail.com" },
    { icon: Phone, label: "Phone", value: "+91 8790015394" },
  ];


  return (
    <MarketingLayout>
      <section className="bg-gradient-hero py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="outline" className="mb-4">Contact</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Let's <span className="text-gradient">talk</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Questions, feedback, or partnership ideas — we'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold">Contact information</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer email or a call? Pick whatever works best for you.
            </p>
            <div className="mt-8 space-y-4">
              {info.map((i) => (
                <div key={i.label} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <i.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{i.label}</div>
                    <div className="mt-1 truncate text-sm font-medium">{i.value}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary/10 text-secondary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Response time</div>
                  <div className="mt-1 text-sm text-muted-foreground">Within 24 hours on business days.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" maxLength={100} required placeholder="Aarav Sharma" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" maxLength={255} required placeholder="you@college.edu" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" maxLength={200} required placeholder="How can we help?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" maxLength={5000} required rows={5} placeholder="Tell us more..." />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-elegant hover:opacity-95">
                {submitting ? "Sending..." : (<>Send message <Send className="ml-1.5 h-4 w-4" /></>)}
              </Button>
            </form>
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
}
