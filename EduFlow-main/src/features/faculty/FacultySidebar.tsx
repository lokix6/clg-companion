import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { facultyNav } from "./nav";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function FacultySidebar({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/faculty" ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/faculty" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <div className="leading-tight">
              <div className="text-sm font-bold">EduFlow</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Faculty Portal
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
            Teach
          </div>
          <ul className="space-y-0.5">
            {facultyNav.map((item) => {
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-sidebar-border pt-3">
            <Link
              to="/login"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="flex-1 text-left">Switch role</span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>

          <div className="mt-auto rounded-xl border border-sidebar-border bg-background p-4">
            <div className="text-xs font-semibold">Faculty</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage subjects, attendance, and academic content for your students.
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
