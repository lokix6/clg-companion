import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, NotebookPen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FacultyNoteDialog } from "@/features/faculty/FacultyNoteDialog";
import { facultyKeys, facultyMySubjectsQueryOptions } from "@/features/faculty/queries";
import type { Note } from "@/features/notes/types";
import { NOTES_BUCKET, formatBytes, readableType } from "@/features/notes/types";
import { getNoteDownloadUrl } from "@/features/notes/queries";

export const Route = createFileRoute("/faculty/notes")({
  component: FacultyNotesPage,
});

function FacultyNotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const subjectsQ = useQuery(facultyMySubjectsQueryOptions());

  const notesQ = useQuery({
    queryKey: facultyKeys.myNotes(),
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Note[]) ?? [];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (notesQ.data ?? []).filter((n) =>
      !t
        ? true
        : [n.title, n.description, n.subject_code, n.file_name]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(t)),
    );
  }, [notesQ.data, q]);

  const del = useMutation({
    mutationFn: async (n: Note) => {
      if (n.file_url) {
        await supabase.storage.from(NOTES_BUCKET).remove([n.file_url]);
      }
      const { error } = await supabase.from("notes").delete().eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facultyKeys.myNotes() });
      qc.invalidateQueries({ queryKey: facultyKeys.stats() });
      toast.success("Note deleted");
      setToDelete(null);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Delete failed"),
  });

  const handleDownload = async (n: Note) => {
    try {
      const url = await getNoteDownloadUrl(n.file_url, true);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message || "Could not download");
    }
  };

  const noSubjects = (subjectsQ.data ?? []).length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Upload and manage notes for the subjects assigned to you. Students in those subjects can view and download them."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={noSubjects}
            className="bg-gradient-primary shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-2 h-4 w-4" /> Upload note
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            className="pl-9"
          />
        </div>
      </div>

      {notesQ.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes uploaded"
          description={
            noSubjects
              ? "You have no subjects assigned yet. Ask an administrator to assign subjects to you."
              : "Upload your first note to share it with students."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {n.subject_code ?? "—"}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold" title={n.title}>
                    {n.title}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 font-medium">
                  {readableType(n.file_type)}
                </Badge>
              </div>
              {n.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{new Date(n.created_at).toLocaleDateString()}</span>
                <span>{formatBytes(n.file_size)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDownload(n)}>
                  <Download className="mr-1 h-3.5 w-3.5" /> Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(n);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToDelete(n)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FacultyNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editing}
        subjects={subjectsQ.data ?? []}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete note?"
        description={toDelete ? `"${toDelete.title}" will be permanently removed for all students.` : ""}
        loading={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
        }}
      />
    </div>
  );
}
