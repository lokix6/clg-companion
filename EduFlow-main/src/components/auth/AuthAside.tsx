import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

type AuthAsideProps = {
  headline: React.ReactNode;
  description?: React.ReactNode;
  bullets?: string[];
  className?: string;
};

const PARTICLES = [
  { left: "12%", top: "22%", size: 6, delay: "0s", dur: "7s" },
  { left: "28%", top: "68%", size: 4, delay: "1.4s", dur: "9s" },
  { left: "44%", top: "16%", size: 5, delay: "2.1s", dur: "8s" },
  { left: "62%", top: "48%", size: 3, delay: "0.7s", dur: "10s" },
  { left: "78%", top: "28%", size: 6, delay: "3.2s", dur: "8.5s" },
  { left: "70%", top: "78%", size: 4, delay: "1.9s", dur: "11s" },
  { left: "20%", top: "44%", size: 3, delay: "2.6s", dur: "9.5s" },
  { left: "88%", top: "60%", size: 5, delay: "0.4s", dur: "7.5s" },
];

/**
 * Animated brand panel used on the left side of the auth screens.
 * Uses dedicated --auth-aside tokens so it stays high-contrast in light and dark mode.
 */
export function AuthAside({ headline, description, bullets, className }: AuthAsideProps) {
  return (
    <div
      className={cn("auth-aside relative hidden overflow-hidden lg:block", className)}
    >
      {/* Rotating conic sheen */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, oklch(1 0 0 / 0.16) 40deg, transparent 110deg, oklch(1 0 0 / 0.10) 190deg, transparent 260deg, oklch(1 0 0 / 0.14) 320deg, transparent 360deg)",
          animation: "auth-conic 26s linear infinite",
        }}
      />

      {/* Aurora blobs */}
      <div
        className="pointer-events-none absolute -left-32 -top-24 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.2 265 / 0.55), transparent 65%)",
          animation: "auth-drift-a 18s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.68 0.23 320 / 0.5), transparent 65%)",
          animation: "auth-drift-b 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.18 200 / 0.35), transparent 65%)",
          animation: "auth-drift-c 26s ease-in-out infinite",
        }}
      />

      {/* Panning dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.6) 1px, transparent 0)",
          backgroundSize: "26px 26px",
          animation: "auth-grid-pan 14s linear infinite",
          maskImage: "radial-gradient(ellipse 90% 80% at 30% 40%, black 15%, transparent 80%)",
        }}
      />

      {/* Animated constellation lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 600 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[
          "M-20 180 C 160 120, 300 300, 620 200",
          "M-20 470 C 200 400, 340 620, 620 520",
          "M-20 720 C 180 700, 320 820, 620 760",
        ].map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="oklch(1 0 0 / 0.35)"
            strokeWidth="1"
            strokeDasharray="8 14"
            style={{ animation: `auth-dash ${16 + i * 6}s linear infinite` }}
          />
        ))}
      </svg>

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <span
          key={`${p.left}-${p.top}`}
          className="pointer-events-none absolute rounded-full bg-white/70"
          style={{
            left: p.left,
            top: p.top,
            height: p.size,
            width: p.size,
            boxShadow: "0 0 14px 3px oklch(1 0 0 / 0.35)",
            animation: `auth-float ${p.dur} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}

      {/* Sheen sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent"
          style={{ animation: "auth-sheen 10s ease-in-out infinite" }}
        />
      </div>

      {/* Content */}
      <div className="relative flex h-full flex-col p-12 xl:p-16">
        <Link to="/" className="flex w-fit items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <BrandLogo className="h-8 w-8 shrink-0" />
            <span
              className="absolute inset-0 rounded-xl ring-1 ring-white/40"
              style={{ animation: "auth-pulse-ring 3.2s ease-out infinite" }}
            />
          </span>
          <span>
            <span className="block text-base font-bold leading-none">EduFlow</span>
            <span className="auth-aside-muted mt-1 block text-[10px] font-medium uppercase tracking-[0.2em]">
              CollegeCompanion
            </span>
          </span>
        </Link>

        {/* Vertically centered message block */}
        <div className="flex flex-1 flex-col justify-center py-12">
          <span
            className="auth-aside-muted mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] backdrop-blur"
            style={{ animation: "auth-rise 0.6s ease-out both" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Smart campus platform
          </span>

          <h2
            className="max-w-[16ch] text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl"
            style={{ animation: "auth-rise 0.7s ease-out 0.08s both" }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, oklch(1 0 0) 25%, oklch(0.86 0.1 300) 50%, oklch(1 0 0) 75%)",
                backgroundSize: "200% 100%",
                animation: "auth-shimmer 8s linear infinite",
              }}
            >
              {headline}
            </span>
          </h2>

          {description ? (
            <p
              className="auth-aside-muted mt-5 max-w-md text-[15px] leading-relaxed"
              style={{ animation: "auth-rise 0.7s ease-out 0.18s both" }}
            >
              {description}
            </p>
          ) : null}

          {bullets?.length ? (
            <ul className="mt-7 space-y-3 text-sm">
              {bullets.map((b, i) => (
                <li
                  key={b}
                  className="flex items-center gap-3"
                  style={{ animation: `auth-rise 0.6s ease-out ${0.22 + i * 0.1}s both` }}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-white/25 bg-white/10 text-[11px] font-bold backdrop-blur">
                    ✓
                  </span>
                  <span className="auth-aside-muted">{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="auth-aside-muted flex items-center justify-between text-xs">
          <span>© {new Date().getFullYear()} EduFlow</span>
          <span className="hidden items-center gap-2 xl:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Students · Faculty · Admins
          </span>
        </div>
      </div>
    </div>
  );
}
