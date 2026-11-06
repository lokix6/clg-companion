import { AuthAside } from "@/components/auth/AuthAside";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth/AuthProvider";
import { signupSchema, type SignupInput } from "@/lib/auth/schemas";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — EduFlow" },
      { name: "description", content: "Sign up for EduFlow and organize your college life in minutes." },
    ],
  }),
  component: SignupPage,
});

const BRANCHES = ["CSE", "ECE", "EEE", "Mechanical", "Civil", "MBA", "Other"] as const;
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
    return "An account with this email already exists.";
  if (m.includes("password") && m.includes("weak")) return "Please choose a stronger password.";
  if (m.includes("network")) return "Network error. Please try again.";
  return message || "Something went wrong. Please try again.";
}

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      college_name: "",
      branch: "",
      semester: "",
      password: "",
      confirm: "",
    },
  });

  const branch = watch("branch");
  const semester = watch("semester");

  const onSubmit = async (values: SignupInput) => {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: values.full_name,
          college_name: values.college_name,
          branch: values.branch,
          semester: values.semester,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }

    if (data.session) {
      toast.success("Account created", { description: "Welcome to EduFlow." });
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email", {
        description: "We sent you a confirmation link to finish signup.",
      });
      navigate({ to: "/login" });
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(friendlyAuthError(result.error.message ?? "Google sign-up failed"));
      return;
    }
    if (result.redirected) return;
    toast.success("Welcome!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <span className="font-bold">EduFlow</span>
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Create your student account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Free forever for students. Faculty and Administrators join by invitation only.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="Aarav Sharma" {...register("full_name")} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@college.edu" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college_name">College name</Label>
              <Input id="college_name" placeholder="IIT Bombay" {...register("college_name")} />
              {errors.college_name && <p className="text-xs text-destructive">{errors.college_name.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Select value={branch} onValueChange={(v) => setValue("branch", v, { shouldValidate: true })}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branch && <p className="text-xs text-destructive">{errors.branch.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sem">Semester</Label>
                <Select value={semester} onValueChange={(v) => setValue("semester", v, { shouldValidate: true })}>
                  <SelectTrigger id="sem">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm</Label>
                <Input id="confirm" type="password" placeholder="••••••••" {...register("confirm")} />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-elegant hover:opacity-95">
              {submitting ? "Creating account..." : "Create Account"}
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
              <GoogleIcon /> Sign up with Google
            </Button>

            <p className="pt-2 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link>
            </p>
          </form>
        </div>
      </div>

      <AuthAside
        headline={
          <>
            Join thousands of students<br />running college on EduFlow.
          </>
        }
        bullets={[
          "Free forever for students",
          "Setup in under a minute",
          "Private, secure, encrypted",
        ]}
      />
    </div>
  );
}
