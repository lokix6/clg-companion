import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BrandLogo } from "@/components/brand/BrandLogo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, loading } = useAuth();
  const isAuthed = !loading && !!session;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9 shrink-0" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">EduFlow</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              CollegeCompanion
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.to
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle className="h-9 w-9" />
          {isAuthed ? (
            <Button asChild size="sm" className="rounded-lg bg-gradient-primary text-sm font-semibold shadow-elegant hover:opacity-95">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-sm font-medium">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="rounded-lg bg-gradient-primary text-sm font-semibold shadow-elegant hover:opacity-95">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-accent md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="space-y-1 px-4 py-3">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === item.to
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {isAuthed ? (
                <Button asChild className="flex-1 bg-gradient-primary" onClick={() => setOpen(false)}>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button
                    asChild
                    className="flex-1 bg-gradient-primary"
                    onClick={() => setOpen(false)}
                  >
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
