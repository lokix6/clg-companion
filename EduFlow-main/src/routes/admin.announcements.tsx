import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { announcementsQuery, communicationKeys, type AnnouncementForMe } from "@/features/communication/queries";
import { AnnouncementCard } from "@/features/communication/announcements/AnnouncementCard";
import { AnnouncementDialog } from "@/features/communication/announcements/AnnouncementDialog";

export const Route = createFileRoute("/admin/announcements")({
  ssr: false,
  component: AdminAnnouncementsPage,
});

function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(announcementsQuery(user?.id));
  const items = data ?? [];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementForMe | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementForMe | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [items, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communicationKeys.announcements() });
      toast.success("Announcement deleted");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Post announcements to the entire college, a department, semester, or subject."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-primary shadow-elegant hover:opacity-95">
            <Plus className="mr-1.5 h-4 w-4" /> New announcement
          </Button>
        }
      />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
      </div>
      {isLoading ? (
        <LoadingState label="Loading..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="Post the first announcement to get started." />
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canManage
              onEdit={() => { setEditing(a); setOpen(true); }}
              onDelete={() => setDeleting(a)}
            />
          ))}
        </div>
      )}
      <AnnouncementDialog open={open} onOpenChange={setOpen} announcement={editing} scope="admin" />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete announcement?"
        description={deleting ? `"${deleting.title}" will be permanently removed.` : ""}
        onConfirm={() => { if (deleting) remove.mutate(deleting.id); }}
        loading={remove.isPending}
      />
    </div>
  );
}
