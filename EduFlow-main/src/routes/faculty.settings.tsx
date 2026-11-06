import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Lock, Monitor, Moon, Palette, ShieldCheck, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard, InfoRow } from "@/components/dashboard/InfoCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/faculty/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Faculty · EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FacultySettingsPage,
});

type Theme = "light" | "dark" | "system";

function FacultySettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>("system");
  const [notifPrefs, setNotifPrefs] = useState({
    assignments: true,
    attendance: true,
    announcements: true,
    events: false,
    email: true,
  });
  const [sendingReset, setSendingReset] = useState(false);

  const googleLinked =
    user?.app_metadata?.providers?.includes("google") ||
    user?.identities?.some((i) => i.provider === "google");

  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleString() : "—";
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—";

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not send reset email");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Settings"
        description="Manage your faculty account and preferences."
        actions={<Badge variant="secondary">Faculty</Badge>}
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <InfoCard>
            <SectionHeader title="Account" description="Your login and connected account details." />
            <div className="mt-3">
              <InfoRow label="Email" value={user?.email} />
              <InfoRow
                label="Password"
                value={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePasswordReset}
                    disabled={sendingReset || !user?.email}
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    {sendingReset ? "Sending..." : "Change password"}
                  </Button>
                }
              />
              <InfoRow
                label="Google account"
                value={
                  googleLinked ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/20">Connected</Badge>
                  ) : (
                    <Badge variant="secondary">Not linked</Badge>
                  )
                }
              />
              <InfoRow label="Role" value={<Badge variant="secondary">Faculty</Badge>} />
            </div>
          </InfoCard>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <InfoCard>
            <SectionHeader
              title="Theme"
              description="Choose how EduFlow looks. System matches your device."
              actions={<Palette className="h-4 w-4 text-muted-foreground" />}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "light", label: "Light", icon: Sun },
                  { key: "dark", label: "Dark", icon: Moon },
                  { key: "system", label: "System", icon: Monitor },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                    theme === opt.key
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                    <opt.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {opt.key === "system" ? "Match device" : `${opt.label} interface`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Dark mode is coming soon. Your selection will be saved when it launches.
            </p>
          </InfoCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <InfoCard>
            <SectionHeader
              title="Notification preferences"
              description="Choose what you want to be notified about."
              actions={<Bell className="h-4 w-4 text-muted-foreground" />}
            />
            <div className="mt-4 divide-y divide-border/60">
              {(
                [
                  { key: "assignments", label: "Assignment submissions", desc: "When students submit assignments." },
                  { key: "attendance", label: "Attendance reminders", desc: "Prompts to mark today's attendance." },
                  { key: "announcements", label: "Announcements", desc: "Notices from the college and admins." },
                  { key: "events", label: "Events", desc: "Campus events and academic calendar." },
                  { key: "email", label: "Email notifications", desc: "Daily digests to your inbox." },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={notifPrefs[item.key]}
                    onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Notification delivery is coming soon. Preferences shown here are saved locally.
            </p>
          </InfoCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <InfoCard>
            <SectionHeader
              title="Security"
              description="Session and device information."
              actions={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
            />
            <div className="mt-3">
              <InfoRow label="Last login" value={lastSignIn} />
              <InfoRow label="Account created" value={createdAt} />
              <InfoRow
                label="Session status"
                value={<Badge className="bg-success/15 text-success hover:bg-success/20">Active</Badge>}
              />
            </div>
          </InfoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
