# EduFlow Lab — Phase 1: SQL Practice MVP

## Existing architecture (relevant parts)

- **Routing**: TanStack Start file routes. Student portal lives under `src/routes/_authenticated/dashboard/*`, gated by the integration-managed `_authenticated/route.tsx` (session check + role isolation, `ssr: false`). Sidebar links come from `src/lib/dashboard/nav.ts`.
- **Auth/data**: Supabase via `@/integrations/supabase/client` (RLS as the user). All app tables live in `public` with GRANTs + RLS. No lab tables exist yet.
- **UI**: shadcn/Tailwind v4 design tokens in `src/styles.css`, shared cards (`InfoCard`, `PageHeader`, `EmptyState`), dark mode via `.dark`.
- **No SQL editor or in-browser SQL engine is installed** — both must be added.

## Key decision: SQL engine

**PGlite (`@electric-sql/pglite`)** — real PostgreSQL compiled to WASM, running entirely in the browser.

- True PostgreSQL dialect (matches the brief's preference; dates, NULLs, subqueries, JOINs all behave like Postgres).
- Fully isolated: a fresh in-memory instance per question, seeded only with that question's sample schema/data. Student SQL can never reach the production database.
- Loaded via dynamic import so the ~3 MB WASM bundle only downloads when a student opens the SQL workspace.
- Safety layers: SELECT-only validation (block INSERT/UPDATE/DELETE/DDL/DCL), execution in a rolled-back transaction, row-limit and timeout guards.

**Editor**: `@uiw/react-codemirror` + `@codemirror/lang-sql` for SQL syntax highlighting (theme-aware, light/dark).

## Database (one migration)

1. **`lab_questions`** — the seeded question bank: title, statement, topic, difficulty, question number, setup SQL (schema + sample data), expected output (JSON rows), hint, solution. GRANT SELECT to `authenticated`; writes restricted to `service_role` (students can never change answers/evaluation data). Seeded with ~24 real questions covering all 12 required topics, each with known test cases.
2. **`lab_attempts`** — per-student progress: user_id, question_id, last SQL, status (attempted/solved), best score, attempt count, timestamps. GRANTs to `authenticated`, RLS owner-only (`auth.uid() = user_id`) for select/insert/update.

## Routes & UI

- `src/routes/_authenticated/lab.tsx` → `/lab` — Lab dashboard: welcome header, summary cards (questions solved/attempted, completion %, recent activity from real `lab_attempts` data), SQL Lab entry card, "coming soon" cards for future labs clearly marked as not yet available.
- `src/routes/_authenticated/lab.sql.tsx` → `/lab/sql` — SQL workspace:
  - Left: question list grouped by topic with difficulty badges and solved/attempted state.
  - Right: question detail (title, statement, sample schema/data table, expected output), CodeMirror SQL editor, Run Query / Submit Answer / Reset / View Hint actions, results table, and clear SQL error messages.
- Add "EduFlow Lab" entry to `src/lib/dashboard/nav.ts` (student sidebar).

## Evaluation strategy

- Run the student's query in the question's isolated PGlite instance; normalize and compare rows against the stored expected output (order-sensitive when the question requires ORDER BY, order-insensitive otherwise).
- Feedback states: correct (marks solved, saves progress), incorrect (shows row/column mismatch guidance), SQL error (shows the Postgres error message).

## Files (new)

- `src/features/lab/engine.ts` — PGlite lifecycle, SELECT-only guard, execution with limits
- `src/features/lab/evaluate.ts` — result comparison
- `src/features/lab/queries.ts` — question bank + progress queries/mutations
- `src/features/lab/SqlEditor.tsx`, `QuestionList.tsx`, `QuestionWorkspace.tsx`, `ResultsTable.tsx`
- `src/routes/_authenticated/lab.tsx`, `src/routes/_authenticated/lab.sql.tsx`
- Migration: `lab_questions` + `lab_attempts` + seed questions

## Verification

- Typecheck + build must pass.
- Playwright check (signed in): lab dashboard renders, SQL workspace loads, running a correct query marks the question solved, a wrong query and a syntax error show proper feedback, and existing portals are unaffected.

## Out of scope (per brief)

Python/Statistics/Power BI labs, leaderboards, adaptive tests — shown only as "coming soon" placeholders.
