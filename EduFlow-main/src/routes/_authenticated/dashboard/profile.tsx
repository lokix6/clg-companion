import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard, InfoRow } from "@/components/dashboard/InfoCard";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { Progress } from "@/components/ui/progress";
import { computeProfileCompletion } from "@/lib/dashboard/profile-completion";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilePage,
});

const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Electrical",
  "Mechanical",
  "Civil",
  "Chemical",
  "Biotechnology",
  "Other",
];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  college_name: z.string().trim().min(2, "College name is required").max(180),
  branch: z.string().min(1, "Select your branch"),
  semester: z.string().min(1, "Select semester"),
});
type ProfileInput = z.infer<typeof profileSchema>;

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      college_name: profile?.college_name ?? "",
      branch: profile?.branch ?? "",
      semester: profile?.semester ? String(profile.semester) : "",
    },
  });

  useEffect(() => {
    form.reset({
      full_name: profile?.full_name ?? "",
      college_name: profile?.college_name ?? "",
      branch: profile?.branch ?? "",
      semester: profile?.semester ? String(profile.semester) : "",
    });
     
  }, [profile?.id]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const initials =
    displayName
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";

  const completion = computeProfileCompletion(profile);

  const onSubmit = async (values: ProfileInput) => {
    if (!user) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          college_name: values.college_name,
          branch: values.branch,
          semester: parseInt(values.semester, 10),
        })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[Profile] update failed", error);
        throw error;
      }
      if (!data) {
        throw new Error(
          "Update was blocked. You may not have permission to change this profile.",
        );
      }
      await refreshProfile();
      toast.success("Profile updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (url: string | null) => {
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[Profile] avatar update failed", error);
      throw error;
    }
    if (!data) throw new Error("Update was blocked by security policy.");
    await refreshProfile();
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal information and account details."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard>
            <SectionHeader
              title="Profile picture"
              description="This photo will be shown across EduFlow."
            />
            <div className="mt-5">
              {user && (
                <AvatarUpload
                  userId={user.id}
                  avatarUrl={profile?.avatar_url ?? null}
                  fallback={initials}
                  onChange={handleAvatarChange}
                />
              )}
            </div>
          </InfoCard>

          <InfoCard>
            <SectionHeader
              title="Personal details"
              description="Update your student information."
            />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="college_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College</FormLabel>
                      <FormControl>
                        <Input placeholder="Your college name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BRANCHES.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEMESTERS.map((s) => (
                              <SelectItem key={s} value={s}>
                                Semester {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={saving || !form.formState.isDirty}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !form.formState.isDirty}
                    className="bg-gradient-primary shadow-elegant hover:opacity-95"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard>
            <SectionHeader title="Account" />
            <div className="mt-3">
              <InfoRow label="Email" value={user?.email} />
              <InfoRow
                label="Role"
                value={<Badge variant="secondary">Student</Badge>}
              />
              <InfoRow label="Member since" value={createdAt} />
            </div>
          </InfoCard>

          <InfoCard>
            <SectionHeader
              title="Profile completion"
              description="A complete profile helps us tailor your experience."
            />
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">Completeness</span>
                <span className="font-semibold">{completion.percent}%</span>
              </div>
              <Progress value={completion.percent} className="mt-2 h-2" />
              {completion.missing.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {completion.missing.map((m) => (
                    <li key={m}>Missing: {m}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 text-xs text-success">All set — great job!</div>
              )}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
