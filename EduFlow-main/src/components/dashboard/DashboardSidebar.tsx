import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, LogOut, Shield, Sparkles, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNav } from "@/lib/dashboard/nav";
import { useIsAdmin } from "@/features/admin/useIsAdmin";
import { useIsFaculty } from "@/features/roles/useUserRole";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Props = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

export function DashboardSidebar({ open, onClose, onSignOut }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const { data: isFaculty } = useIsFaculty();

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <div className="leading-tight">
              <div className="text-sm font-bold">EduFlow</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                CollegeCompanion
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Main
          </div>
          <ul className="space-y-0.5">
            {dashboardNav.map((item) => {
              const active = isActive(item.to);
              const content = (
                <>
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {!item.enabled && <Lock className="h-3 w-3" />}
                </>
              );
              const baseCls =
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
              if (!item.enabled) {
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      disabled
                      className={cn(baseCls, "cursor-not-allowed text-muted-foreground/60")}
                    >
                      {content}
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      baseCls,
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
            {isFaculty && (
              <li>
                <Link
                  to="/faculty"
                  onClick={onClose}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Users className="h-4 w-4" />
                  <span className="flex-1 text-left">Faculty Portal</span>
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Shield className="h-4 w-4" />
                  <span className="flex-1 text-left">Admin Portal</span>
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="flex-1 text-left">Logout</span>
              </button>
            </li>
          </ul>

          <div className="mt-auto rounded-xl border border-sidebar-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-xs font-semibold">AI tools are live</div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Study Assistant, Summarizer, Planner and Quizzes are ready to use.
            </p>
          </div>

        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
    </>
  );
}
