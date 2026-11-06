import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteCard } from "@/features/notes/NoteCard";
import { UploadNoteDialog } from "@/features/notes/UploadNoteDialog";
import { PreviewNoteDialog } from "@/features/notes/PreviewNoteDialog";
import { notesKeys, notesQuery } from "@/features/notes/queries";
import { categorize, NOTES_BUCKET, type Note } from "@/features/notes/types";
import { subjectsQuery } from "@/features/academic/queries";

export const Route = createFileRoute("/_authenticated/dashboard/notes")({
  head: () => ({
    meta: [
      { title: "Notes — EduFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const subjectsQ = useQuery(subjectsQuery(uid));
  const notesQ = useQuery(notesQuery(uid));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [previewing, setPreviewing] = useState<Note | null>(null);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const subjectsById = useMemo(
    () => new Map((subjectsQ.data ?? []).map((s) => [s.id, s])),
    [subjectsQ.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const day = 86_400_000;
    let list = (notesQ.data ?? []).filter((n) => {
      if (q) {
        const subj = subjectsById.get(n.subject_id)?.subject_name ?? "";
        if (
          !n.title.toLowerCase().includes(q) &&
          !subj.toLowerCase().includes(q)
        )
          return false;
      }
      if (subjectFilter !== "all" && n.subject_id !== subjectFilter) return false;
      if (typeFilter !== "all" && categorize(n.file_type) !== typeFilter) return false;
      if (dateFilter !== "all") {
        const created = new Date(n.created_at).getTime();
        if (dateFilter === "week" && now - created > 7 * day) return false;
        if (dateFilter === "month" && now - created > 30 * day) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "subject": {
          const an = subjectsById.get(a.subject_id)?.subject_name ?? "";
          const bn = subjectsById.get(b.subject_id)?.subject_name ?? "";
          return an.localeCompare(bn);
        }
        case "size":
          return b.file_size - a.file_size;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [notesQ.data, search, subjectFilter, typeFilter, dateFilter, sort, subjectsById]);

  const deleteMut = useMutation({
    mutationFn: async (note: Note) => {
      // Remove storage object first
      if (note.file_url) {
        const { error: storageErr } = await supabase.storage
          .from(NOTES_BUCKET)
          .remove([note.file_url]);
        if (storageErr) console.warn("[notes] storage remove failed", storageErr);
      }
      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (uid) qc.invalidateQueries({ queryKey: notesKeys.all(uid) });
      toast.success("Note deleted");
      setDeleting(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Could not delete"),
  });

  const noSubjects = (subjectsQ.data ?? []).length === 0;
  const hasNotes = (notesQ.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Upload, organize, and access study materials by subject."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={noSubjects}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Upload note
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {(subjectsQ.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="doc">Documents</SelectItem>
            <SelectItem value="ppt">Presentations</SelectItem>
            <SelectItem value="image">Images</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="subject">By subject</SelectItem>
            <SelectItem value="size">Largest file</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {notesQ.isLoading ? (
        <LoadingState label="Loading notes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={hasNotes ? "No notes match your filters" : "No notes yet"}
          description={
            hasNotes
              ? "Try clearing filters or search."
              : noSubjects
                ? "Add subjects first, then upload your notes."
                : "Upload your first study note to get started."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              subject={subjectsById.get(n.subject_id)}
              onPreview={() => setPreviewing(n)}
              onEdit={() => {
                setEditing(n);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleting(n)}
            />
          ))}
        </div>
      )}

      <UploadNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editing}
        subjects={subjectsQ.data ?? []}
      />
      <PreviewNoteDialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
        note={previewing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete note?"
        description={deleting ? `"${deleting.title}" will be permanently removed.` : undefined}
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting);
        }}
      />
    </div>
  );
}
