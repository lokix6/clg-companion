import { Link } from "@tanstack/react-router";
import { Twitter, Github, Linkedin, Instagram } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-9 w-9 shrink-0" />
              <div>
                <div className="text-base font-bold">EduFlow</div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  CollegeCompanion
                </div>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              One platform for every student need — assignments, attendance, notes, timetables, and
              campus updates in one beautiful dashboard.
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { Icon: Twitter, label: "Follow EduFlow on Twitter", name: "Twitter" },
                { Icon: Github, label: "EduFlow on GitHub", name: "GitHub" },
                { Icon: Linkedin, label: "EduFlow on LinkedIn", name: "LinkedIn" },
                { Icon: Instagram, label: "Follow EduFlow on Instagram", name: "Instagram" },
              ].map(({ Icon, label, name }) => (
                <a
                  key={name}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Product</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold">Legal</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
              <li><a href="#" className="hover:text-foreground">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} EduFlow. All rights reserved.</div>
          <div>Made with care for students.</div>
        </div>
      </div>
    </footer>
  );
}
