import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function PasswordChangeGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  const q = useQuery({
    queryKey: ["must-change-password", user?.id ?? "anon"],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!(data as { must_change_password?: boolean } | null)?.must_change_password;
    },
  });

  const onChangePage = loc.pathname === "/dashboard/change-password";
  if (q.data && !onChangePage) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <AlertCircle className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">Set a new password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You're using a temporary password. Please set a new one to continue using EduFlow.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard/change-password">Change password</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
