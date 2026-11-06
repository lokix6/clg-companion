import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { useAuth } from "@/lib/auth/AuthProvider";
import { announcementsQuery } from "@/features/communication/queries";
import { AnnouncementCard } from "@/features/communication/announcements/AnnouncementCard";
import { ANNOUNCEMENT_PRIORITIES } from "@/features/communication/types";

export const Route = createFileRoute("/_authenticated/dashboard/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — EduFlow" },
      { name: "description", content: "Campus announcements." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(announcementsQuery(user?.id));
  const items = data ?? [];

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [audience, setAudience] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (priority !== "all" && a.priority !== priority) return false;
      if (audience !== "all" && a.audience_type !== audience) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    });
  }, [items, search, priority, audience]);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Announcements targeted to you." />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search announcements..." className="pl-9" />
        </div>
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All audiences</SelectItem>
            <SelectItem value="College">College</SelectItem>
            <SelectItem value="Department">Department</SelectItem>
            <SelectItem value="Semester">Semester</SelectItem>
            <SelectItem value="Subject">Subject</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {ANNOUNCEMENT_PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading announcements..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={items.length === 0 ? "No announcements yet" : "No matches"}
          description={items.length === 0 ? "You're all caught up." : "Try adjusting your filters."}
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => (<AnnouncementCard key={a.id} announcement={a} />))}
        </div>
      )}
    </div>
  );
}
