import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FacultyShell } from "@/features/faculty/FacultyShell";

export const Route = createFileRoute("/faculty")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "faculty")
      .maybeSingle();
    if (!roleRow) {
      throw redirect({ to: "/dashboard" });
    }
    return { user: data.user };
  },
  component: () => (
    <FacultyShell>
      <Outlet />
    </FacultyShell>
  ),
});
