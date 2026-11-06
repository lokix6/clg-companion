import type { PGlite } from "@electric-sql/pglite";
import { MAX_ROWS, type QueryResult } from "./types";

/**
 * EduFlow Lab SQL engine.
 *
 * Runs student SQL in PGlite — a real PostgreSQL compiled to WASM that lives
 * entirely in the browser. Each dataset gets its own isolated in-memory
 * database seeded only with practice data, so student SQL can never touch the
 * production database. Defense in depth:
 *  1. SELECT-only validation (single statement, no data-modifying keywords).
 *  2. Execution inside a transaction that is always rolled back.
 *  3. Row cap for display and a wall-clock timeout.
 */

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|set|reset|vacuum|analyze|explain|execute|prepare|deallocate|listen|unlisten|notify|lock|comment|reindex|cluster|refresh|discard|security|import|checkpoint|cluster)\b/i;

export function validateSelectOnly(sql: string): string | null {
  const cleaned = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();
  if (!cleaned) return "Type a SQL query first.";
  const body = cleaned.replace(/;+\s*$/, "");
  if (body.includes(";")) return "Only a single SELECT statement is allowed.";
  if (!/^(select|with|values|table)\b/i.test(body))
    return "Only SELECT queries are allowed in the practice environment.";
  if (FORBIDDEN.test(body))
    return "That statement is not allowed here. Practice queries are read-only SELECT statements.";
  return null;
}

type DbHandle = { db: PGlite; busy: boolean };

const instances = new Map<string, Promise<DbHandle>>();

async function getDb(datasetKey: string, setupSql: string): Promise<DbHandle> {
  let pending = instances.get(datasetKey);
  if (!pending) {
    pending = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const db = new PGlite();
      await db.exec(setupSql);
      return { db, busy: false };
    })();
    instances.set(datasetKey, pending);
  }
  return pending;
}

class Rollback extends Error {
  constructor(public result: { fields: { name: string }[]; rows: Record<string, unknown>[] }) {
    super("lab-rollback");
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query took too long and was stopped.")), ms),
    ),
  ]);
}

export type RunOutcome =
  | { ok: true; result: QueryResult }
  | { ok: false; error: string };

export async function runPracticeQuery(
  datasetKey: string,
  setupSql: string,
  sql: string,
): Promise<RunOutcome> {
  const validationError = validateSelectOnly(sql);
  if (validationError) return { ok: false, error: validationError };

  try {
    const handle = await withTimeout(getDb(datasetKey, setupSql), 30_000);
    if (handle.busy) return { ok: false, error: "The practice database is busy. Try again." };
    handle.busy = true;
    try {
      const start = performance.now();
      const box: { raw: Rollback["result"] | null } = { raw: null };
      await withTimeout(
        (async () => {
          try {
            await handle.db.transaction(async (tx) => {
              const r = await tx.query(sql);
              throw new Rollback(r as Rollback["result"]);
            });
          } catch (e) {
            if (e instanceof Rollback) {
              box.raw = e.result;
              return;
            }
            throw e;
          }
        })(),
        15_000,
      );
      const raw = box.raw;
      if (!raw) return { ok: false, error: "Query did not return a result." };
      const rows = raw.rows.slice(0, MAX_ROWS + 1);
      return {
        ok: true,
        result: {
          columns: raw.fields.map((f: { name: string }) => f.name),
          rows: rows.slice(0, MAX_ROWS),
          truncated: rows.length > MAX_ROWS,
          durationMs: Math.round(performance.now() - start),
        },
      };
    } finally {
      handle.busy = false;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong while running the query.";
    return { ok: false, error: message };
  }
}

/** Reset a dataset back to its pristine seeded state (used by the Reset action). */
export async function resetDataset(datasetKey: string, setupSql: string): Promise<void> {
  const pending = instances.get(datasetKey);
  if (pending) {
    try {
      const handle = await pending;
      await handle.db.close();
    } catch {
      // ignore — a fresh instance will be created below
    }
    instances.delete(datasetKey);
  }
  await getDb(datasetKey, setupSql);
}
