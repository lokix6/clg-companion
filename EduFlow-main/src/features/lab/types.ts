export type LabDifficulty = "easy" | "medium" | "hard";

export interface LabQuestion {
  id: string;
  question_number: number;
  topic: string;
  difficulty: LabDifficulty;
  title: string;
  statement: string;
  dataset_key: string;
  expected_output: Record<string, unknown>[];
  expected_ordered: boolean;
  hint: string | null;
  solution: string | null;
}

export interface LabAttempt {
  id: string;
  user_id: string;
  question_id: string;
  last_sql: string | null;
  status: "attempted" | "solved";
  attempts: number;
  solved_at: string | null;
  updated_at: string;
}

export interface LabDataset {
  id: string;
  key: string;
  name: string;
  description: string | null;
  setup_sql: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  durationMs: number;
}

export const TOPIC_ORDER = [
  "SELECT & FROM",
  "WHERE Clause",
  "DISTINCT",
  "LIMIT & OFFSET",
  "Aliases",
  "ORDER BY",
  "Aggregate Functions",
  "GROUP BY & HAVING",
  "JOINs",
  "Subqueries",
  "Date & Timestamp Filtering",
  "NULL Handling",
] as const;

export const MAX_ROWS = 500;
