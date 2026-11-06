import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // Role isolation: student routes live under /dashboard/*.
    // Faculty and admin users must never enter the Student portal —
    // redirect them into their own portal instead.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role as string));
    if (!roleSet.has("student")) {
      if (roleSet.has("faculty")) throw redirect({ to: "/faculty" });
      if (roleSet.has("admin")) throw redirect({ to: "/admin" });
    }
    return { user: data.user };
  },
  component: () => (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  ),
});
