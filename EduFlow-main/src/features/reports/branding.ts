import type { Profile } from "@/lib/auth/AuthProvider";

export const BRAND = "EduFlow";
export const TAGLINE = "CollegeCompanion";

export type ReportContext = {
  role: "admin" | "faculty" | "student";
  profile: Profile | null;
  filters: Record<string, unknown>;
  filterLabels?: Record<string, string>;
};

export function collegeName(profile: Profile | null): string {
  return profile?.college_name || "EduFlow College";
}

export function generatedByLabel(profile: Profile | null): string {
  return profile?.full_name || profile?.email || "System";
}

export function formatFiltersForDisplay(
  filters: Record<string, unknown>,
  labels?: Record<string, string>,
): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v == null || v === "" || v === "all") continue;
    const key = labels?.[k] ?? k.replace(/_/g, " ");
    out.push(`${key}: ${String(v)}`);
  }
  return out;
}

export function nowStamp(): string {
  return new Date().toLocaleString();
}
