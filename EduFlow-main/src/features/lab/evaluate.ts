import type { QueryResult } from "./types";

export interface EvalOutcome {
  correct: boolean;
  message: string;
}

/** Normalize a cell value so browser PGlite results and stored JSONB compare equal. */
function norm(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function normRow(row: Record<string, unknown>, columns: string[]): string {
  return JSON.stringify(columns.map((c) => norm(row[c])));
}

export function evaluateResult(
  actual: QueryResult,
  expected: Record<string, unknown>[],
  ordered: boolean,
): EvalOutcome {
  const expectedColumns = expected.length > 0 ? Object.keys(expected[0]) : [];
  const actualColumns = actual.columns;

  if (expectedColumns.length === 0) {
    return actual.rows.length === 0
      ? { correct: true, message: "Correct — the expected result is empty." }
      : { correct: false, message: "The expected result is empty, but your query returned rows." };
  }

  // Column order is not significant (JSONB does not preserve key order);
  // the set of column names — including aliases — must match exactly.
  const sameColumns =
    actualColumns.length === expectedColumns.length &&
    expectedColumns.every((c) => actualColumns.includes(c));
  if (!sameColumns) {
    return {
      correct: false,
      message: `Column mismatch. Expected columns: ${expectedColumns.join(", ")} — your query returned: ${actualColumns.join(", ") || "(none)"}. Check your selected columns and aliases.`,
    };
  }

  if (actual.rows.length !== expected.length) {
    return {
      correct: false,
      message: `Expected ${expected.length} row${expected.length === 1 ? "" : "s"} but your query returned ${actual.rows.length}.`,
    };
  }

  if (ordered) {
    for (let i = 0; i < expected.length; i++) {
      if (normRow(actual.rows[i], expectedColumns) !== normRow(expected[i], expectedColumns)) {
        return {
          correct: false,
          message: `Row ${i + 1} doesn't match the expected output. Check your values and sort order.`,
        };
      }
    }
    return { correct: true, message: "Correct! Your query matches the expected output exactly." };
  }

  const sortRows = (rows: Record<string, unknown>[]) =>
    rows.map((r) => normRow(r, expectedColumns)).sort();
  const a = sortRows(actual.rows);
  const e = sortRows(expected);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i]) {
      return { correct: false, message: "Your rows don't match the expected output. Check your values." };
    }
  }
  return { correct: true, message: "Correct! Your query matches the expected output." };
}
