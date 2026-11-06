import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard, InfoRow } from "@/components/dashboard/InfoCard";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { facultyMySubjectsQueryOptions } from "@/features/faculty/queries";

export const Route = createFileRoute("/faculty/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FacultyProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  college_name: z.string().trim().min(2, "College name is required").max(180),
  department: z.string().trim().min(2, "Department is required").max(120),
});
type ProfileInput = z.infer<typeof profileSchema>;

function FacultyProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const subjects = useQuery(facultyMySubjectsQueryOptions());
  const facultyDetails = useQuery({
    queryKey: ["faculty", "profile", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      college_name: profile?.college_name ?? "",
      department: "",
    },
  });

  useEffect(() => {
    form.reset({
      full_name: profile?.full_name ?? "",
      college_name: profile?.college_name ?? "",
      department: facultyDetails.data?.department ?? "",
    });

  }, [profile?.id, facultyDetails.data?.department]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Faculty";
  const initials =
    displayName
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "F";

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
          department: values.department,
        })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Update was blocked by security policy.");
      await refreshProfile();
      toast.success("Profile updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update profile");
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
    if (error) throw error;
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
        title="Faculty Profile"
        description="Manage your faculty account information."
        actions={
          <Button asChild variant="outline">
            <Link to="/faculty/settings">Settings</Link>
          </Button>
        }
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
              description="Update your faculty information."
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
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <InfoRow label="Phone" value={user?.phone || "Not provided"} />
              <InfoRow
                label="Role"
                value={<Badge variant="secondary">Faculty</Badge>}
              />
              <InfoRow
                label="Designation"
                value={(user?.user_metadata?.designation as string | undefined) || "Not provided"}
              />
              <InfoRow
                label="Office"
                value={(user?.user_metadata?.office as string | undefined) || "Not provided"}
              />
              <InfoRow label="Member since" value={createdAt} />
            </div>
          </InfoCard>

          <InfoCard>
            <SectionHeader title="Subjects assigned" />
            {subjects.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading subjects…</p>
            ) : subjects.isError ? (
              <p className="mt-3 text-sm text-destructive">Could not load assigned subjects.</p>
            ) : (subjects.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No subjects assigned.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(subjects.data ?? []).map((subject) => (
                  <Badge key={subject.subject_key} variant="outline">
                    {subject.subject_code ? `${subject.subject_code} · ` : ""}{subject.subject_name}
                  </Badge>
                ))}
              </div>
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
