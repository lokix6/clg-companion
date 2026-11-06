import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { categorize, formatBytes, readableType, type Note } from "./types";
import { getNoteDownloadUrl } from "./queries";

export function PreviewNoteDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  note: Note | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !note) {
      setUrl(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getNoteDownloadUrl(note.file_url, false)
      .then((u) => setUrl(u))
      .catch((e: unknown) => setError((e as Error).message || "Could not load preview"))
      .finally(() => setLoading(false));
  }, [open, note]);

  if (!note) return null;
  const cat = categorize(note.file_type);
  const previewable = cat === "pdf" || cat === "image";

  const handleDownload = async () => {
    try {
      const dl = await getNoteDownloadUrl(note.file_url, true);
      window.open(dl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message || "Could not download");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{note.title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {readableType(note.file_type)} • {formatBytes(note.file_size)}
          </span>
          <div className="flex gap-2">
            {url && (
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open in new tab
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>
        <div className="mt-3 h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
          {loading ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Loading preview...
            </div>
          ) : error ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !previewable ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
              In-browser preview isn't available for this file type.
              <br />
              Use the Download button to open it.
            </div>
          ) : url ? (
            cat === "image" ? (
              <img
                src={url}
                alt={note.title}
                className="mx-auto h-full w-auto object-contain"
              />
            ) : (
              <iframe
                src={url}
                title={note.title}
                className="h-full w-full"
              />
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
