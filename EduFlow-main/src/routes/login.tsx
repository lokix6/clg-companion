import { AuthAside } from "@/components/auth/AuthAside";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";

type PortalRole = "student" | "faculty" | "admin";

const ROLE_META: Record<PortalRole, { label: string; redirect: string; icon: typeof User; notFoundMsg: string }> = {
  student: {
    label: "Student",
    redirect: "/dashboard",
    icon: User,
    notFoundMsg: "This account is not registered as a Student.",
  },
  faculty: {
    label: "Faculty",
    redirect: "/faculty",
    icon: Users,
    notFoundMsg: "This account is not registered as Faculty.",
  },
  admin: {
    label: "Administrator",
    redirect: "/admin",
    icon: Shield,
    notFoundMsg: "This account is not registered as an Administrator.",
  },
};

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: "Login — EduFlow" },
      { name: "description", content: "Sign in to your EduFlow account as a Student, Faculty, or Administrator." },
    ],
  }),
  component: LoginPage,
});

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Invalid email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first.";
  if (m.includes("network")) return "Network error. Please try again.";
  return message || "Something went wrong. Please try again.";
}

async function verifyRoleAndRedirect(role: PortalRole): Promise<PortalRole | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", role)
    .maybeSingle();
  return data ? role : null;
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = useSearch({ from: "/login" });
  const [role, setRole] = useState<PortalRole>("student");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If a session already exists on mount, don't auto-route — user should pick a role.
    // But if URL has redirect param, honor it after they log in.
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setSubmitting(false);
      toast.error(friendlyAuthError(error.message));
      return;
    }

    // Auto-redeem any pending Faculty invite issued to this email.
    // Handles the case where a Faculty invitee had to confirm their email
    // before a session existed, so redemption couldn't run on /join/$code.
    try {
      const { data: redeemData, error: redeemErr } = await supabase.rpc(
        "redeem_pending_faculty_invite_for_me",
      );
      if (redeemErr) {
        console.warn("[login] auto-redeem RPC failed", redeemErr);
      } else if (redeemData && (redeemData as { ok?: boolean }).ok) {
        console.info("[login] auto-redeemed faculty invite");
      }
    } catch (e) {
      console.warn("[login] auto-redeem threw", e);
    }

    const verified = await verifyRoleAndRedirect(role);
    if (!verified) {
      await supabase.auth.signOut();
      setSubmitting(false);
      toast.error(ROLE_META[role].notFoundMsg);
      return;
    }
    setSubmitting(false);
    toast.success(`Welcome, ${ROLE_META[verified].label}!`);
    const target = safeRedirect(redirectTo) || ROLE_META[verified].redirect;
    navigate({ to: target as "/dashboard" });
  };


  const handleGoogle = async () => {
    // Store selected role so post-OAuth flow can verify.
    try {
      sessionStorage.setItem("eduflow:selected-role", role);
    } catch {
      // ignore
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/login",
    });
    if (result.error) {
      toast.error(friendlyAuthError(result.error.message ?? "Google sign-in failed"));
      return;
    }
    if (result.redirected) return;
    // In-iframe token: verify then route.
    const verified = await verifyRoleAndRedirect(role);
    if (!verified) {
      await supabase.auth.signOut();
      toast.error(ROLE_META[role].notFoundMsg);
      return;
    }
    toast.success(`Welcome, ${ROLE_META[verified].label}!`);
    navigate({ to: ROLE_META[verified].redirect as "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthAside
        headline={
          <>
            One platform.<br />Three perspectives.
          </>
        }
        description="Students track their academics. Faculty manage classes. Administrators oversee the campus — all in one workspace."
      />

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <span className="font-bold">EduFlow</span>
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose your role and sign in.</p>

          <div className="mt-6">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sign in as
            </Label>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-1">
              {(Object.keys(ROLE_META) as PortalRole[]).map((r) => {
                const Icon = ROLE_META[r].icon;
                const active = r === role;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all",
                      active
                        ? "bg-background text-foreground shadow-sm ring-1 ring-primary/30"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{ROLE_META[r].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@college.edu" className="pl-9" {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register("password")} />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-elegant hover:opacity-95">
              {submitting ? "Signing in..." : `Sign in as ${ROLE_META[role].label}`}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
              <GoogleIcon /> Continue with Google
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              Faculty join by invitation. Administrators are promoted from existing Faculty accounts.
            </p>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Sign up as Student
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function safeRedirect(target: string | undefined): string | null {
  if (!target) return null;
  if (target.startsWith("/") && !target.startsWith("//")) return target;
  return null;
}
