import {
  Download,
  Eye,
  FileImage,
  FileText,
  Pencil,
  Presentation,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categorize, formatBytes, readableType, type Note } from "./types";
import { getNoteDownloadUrl } from "./queries";
import type { Subject } from "@/features/academic/types";

const CATEGORY_ICON = {
  pdf: FileText,
  doc: FileText,
  ppt: Presentation,
  image: FileImage,
  other: FileText,
} as const;

const CATEGORY_TONE = {
  pdf: "bg-destructive/10 text-destructive",
  doc: "bg-primary/10 text-primary",
  ppt: "bg-warning/15 text-warning",
  image: "bg-success/15 text-success",
  other: "bg-muted text-muted-foreground",
} as const;

export function NoteCard({
  note,
  subject,
  onPreview,
  onEdit,
  onDelete,
}: {
  note: Note;
  subject?: Subject;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = categorize(note.file_type);
  const Icon = CATEGORY_ICON[cat];
  const tone = CATEGORY_TONE[cat];
  const isFacultyShared = !!note.uploaded_by || note.is_shared;
  const subjectLabel =
    subject?.subject_name ?? note.subject_code ?? "Unknown subject";

  const handleDownload = async () => {
    try {
      const url = await getNoteDownloadUrl(note.file_url, true);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message || "Could not download");
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={note.title}>
            {note.title}
          </div>
          <div className="truncate text-xs text-muted-foreground">{subjectLabel}</div>
        </div>
        <Badge variant="outline" className="shrink-0 font-medium">
          {readableType(note.file_type)}
        </Badge>
      </div>

      {isFacultyShared && (
        <div className="mt-3">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/15">From faculty</Badge>
        </div>
      )}

      {note.description && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{note.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
        <span>{formatBytes(note.file_size)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onPreview}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Preview
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="mr-1 h-3.5 w-3.5" /> Download
        </Button>
        {!isFacultyShared && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
