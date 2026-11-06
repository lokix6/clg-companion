import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Accept Faculty invite — EduFlow" },
      { name: "description", content: "Complete your Faculty account setup for EduFlow." },
    ],
  }),
  component: JoinPage,
});

type InviteInfo = {
  code: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  department_name: string | null;
  invited_by_name: string | null;
  expires_at: string;
  redeemed_at: string | null;
};

const formSchema = z
  .object({
    full_name: z.string().min(2, "Enter your full name"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof formSchema>;

function JoinPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_invite_by_code", { _code: code });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setError("This invite link is invalid.");
        setLoading(false);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as InviteInfo;
      if (row.redeemed_at) setError("This invite has already been used.");
      else if (new Date(row.expires_at) < new Date()) setError("This invite has expired.");
      else setInvite(row);
      setLoading(false);
    })();
  }, [code]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "", password: "", confirm: "" },
  });

  useEffect(() => {
    if (invite) reset({ full_name: invite.full_name ?? "", password: "", confirm: "" });
  }, [invite, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!invite) return;
    setSubmitting(true);

    // 1) Try to create the account.
    const { data, error: signErr } = await supabase.auth.signUp({
      email: invite.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    // 2) If the account already exists, try signing in with the provided password.
    let session = data?.session ?? null;
    if (signErr) {
      const msg = signErr.message.toLowerCase();
      const alreadyExists =
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already");
      if (!alreadyExists) {
        setSubmitting(false);
        toast.error(signErr.message);
        return;
      }
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: values.password,
      });
      if (signInErr || !signInData.session) {
        setSubmitting(false);
        toast.info(
          "An account already exists for this email. Sign in with your existing password from the Faculty tab — your role will be upgraded automatically.",
        );
        navigate({ to: "/login" });
        return;
      }
      session = signInData.session;
    }

    // 3) No session (email confirmation required). Tell the user to confirm,
    //    then sign in — login will auto-redeem the invite.
    if (!session) {
      setSubmitting(false);
      toast.success(
        "Account created. Confirm your email, then sign in from the Faculty tab — your Faculty role will be applied automatically.",
      );
      navigate({ to: "/login" });
      return;
    }

    // 4) Session exists — redeem the invite now.
    const { error: redeemErr } = await supabase.rpc("redeem_faculty_invite", { _code: code });
    setSubmitting(false);
    if (redeemErr) {
      console.error("[join] redeem_faculty_invite failed", redeemErr);
      toast.error(`Account created but Faculty role assignment failed: ${redeemErr.message}`);
      return;
    }
    toast.success("Welcome to EduFlow, Faculty!");
    navigate({ to: "/faculty" });
  };


  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <BrandLogo className="h-9 w-9 shrink-0" />
          <span className="font-bold">EduFlow</span>
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Verifying invite…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">Invite unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        ) : invite ? (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <div className="font-semibold text-primary">Faculty invitation</div>
                <div className="text-muted-foreground">
                  Invited by {invite.invited_by_name ?? "an Administrator"}
                  {invite.department_name ? ` · ${invite.department_name}` : ""}
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold">Complete your account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You're joining EduFlow as Faculty.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={invite.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" placeholder="Dr. Priya Rao" {...register("full_name")} />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" placeholder="••••••••" {...register("confirm")} />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-primary shadow-elegant"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept invite & continue
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
