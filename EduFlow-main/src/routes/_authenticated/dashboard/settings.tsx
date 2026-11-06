import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Lock,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { InfoCard, InfoRow } from "@/components/dashboard/InfoCard";
import { computeProfileCompletion } from "@/lib/dashboard/profile-completion";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

type Theme = "light" | "dark" | "system";

function SettingsPage() {
  const { user, profile } = useAuth();
  const [theme, setTheme] = useState<Theme>("system");
  const [notifPrefs, setNotifPrefs] = useState({
    assignments: true,
    attendance: true,
    announcements: true,
    events: false,
    push: false,
    email: true,
  });
  const [sendingReset, setSendingReset] = useState(false);

  const completion = computeProfileCompletion(profile);

  const googleLinked =
    user?.app_metadata?.providers?.includes("google") ||
    user?.identities?.some((i) => i.provider === "google");

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleString()
    : "—";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "—";

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
      const msg = e instanceof Error ? e.message : "Could not send reset email";
      toast.error(msg);
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, appearance and notification preferences."
        actions={<Badge variant="secondary">Version 1</Badge>}
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-5">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* ACCOUNT */}
        <TabsContent value="account" className="space-y-6">
          <InfoCard>
            <SectionHeader
              title="Account"
              description="Your login and connected account details."
            />
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
                    <Badge className="bg-success/15 text-success hover:bg-success/20">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not linked</Badge>
                  )
                }
              />
              <InfoRow
                label="Profile completion"
                value={
                  <div className="flex items-center gap-3">
                    <Progress value={completion.percent} className="h-2 w-32" />
                    <span className="text-sm font-semibold">{completion.percent}%</span>
                  </div>
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/profile">
                  <UserIcon className="mr-1.5 h-4 w-4" /> Manage account
                </Link>
              </Button>
            </div>
          </InfoCard>
        </TabsContent>

        {/* APPEARANCE */}
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

        {/* NOTIFICATIONS */}
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
                  { key: "assignments", label: "Assignment reminders", desc: "Upcoming due dates and submissions." },
                  { key: "attendance", label: "Attendance reminders", desc: "Alerts when a subject dips below 75%." },
                  { key: "announcements", label: "Announcements", desc: "Notices from your college and faculty." },
                  { key: "events", label: "Events", desc: "Fests, hackathons and campus activities." },
                  { key: "push", label: "Push notifications", desc: "Real-time alerts on this device." },
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
                    onCheckedChange={(v) =>
                      setNotifPrefs((p) => ({ ...p, [item.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Notification delivery is coming soon. Preferences shown here are saved locally.
            </p>
          </InfoCard>
        </TabsContent>

        {/* SECURITY */}
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
              <InfoRow
                label="Device"
                value={typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0] + ")" : "Unknown"}
              />
            </div>
          </InfoCard>
        </TabsContent>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <InfoCard>
            <SectionHeader title="General" description="App information." />
            <div className="mt-3">
              <InfoRow label="Product" value="CollegeCompanion" />
              <InfoRow label="Brand" value="EduFlow" />
              <InfoRow label="Version" value={<Badge variant="secondary">Version 1</Badge>} />
            </div>
          </InfoCard>
          
        </TabsContent>
      </Tabs>
    </div>
  );
}
