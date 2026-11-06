import type { Profile } from "@/lib/auth/AuthProvider";

export type ProfileCompletion = {
  percent: number;
  missing: string[];
};

export function computeProfileCompletion(profile: Profile | null): ProfileCompletion {
  const fields: Array<{ key: keyof Profile; label: string }> = [
    { key: "full_name", label: "Full name" },
    { key: "college_name", label: "College" },
    { key: "branch", label: "Branch" },
    { key: "semester", label: "Semester" },
    { key: "avatar_url", label: "Avatar" },
  ];
  if (!profile) return { percent: 0, missing: fields.map((f) => f.label) };
  const missing = fields.filter((f) => !profile[f.key]).map((f) => f.label);
  const percent = Math.round(((fields.length - missing.length) / fields.length) * 100);
  return { percent, missing };
}
