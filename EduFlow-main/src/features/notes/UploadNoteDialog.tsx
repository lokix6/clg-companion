import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { notesKeys } from "./queries";
import {
  ACCEPTED_FILE_TYPES,
  ACCEPT_ATTR,
  MAX_NOTE_SIZE,
  NOTES_BUCKET,
  formatBytes,
  type Note,
} from "./types";
import type { Subject } from "@/features/academic/types";

const schema = z.object({
  subject_id: z.string().min(1, "Subject is required"),
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().max(2000).optional(),
});
type Input = z.infer<typeof schema>;

export function UploadNoteDialog({
  open,
  onOpenChange,
  note,
  subjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  note?: Note | null;
  subjects: Subject[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!note;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { subject_id: "", title: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject_id: note?.subject_id ?? "",
        title: note?.title ?? "",
        description: note?.description ?? "",
      });
      setFile(null);
      setFileError(null);
    }
  }, [open, note, form]);

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES[f.type]) {
      setFileError("Unsupported file type. Use PDF, DOC/DOCX, PPT/PPTX or an image.");
      return;
    }
    if (f.size > MAX_NOTE_SIZE) {
      setFileError(`File exceeds 20 MB limit (${formatBytes(f.size)}).`);
      return;
    }
    setFile(f);
  };

  const mutation = useMutation({
    mutationFn: async (values: Input) => {
      if (!user) throw new Error("Not signed in");

      if (!isEdit && !file) throw new Error("Please choose a file to upload.");

      let filePath = note?.file_url ?? "";
      let fileName = note?.file_name ?? "";
      let fileType = note?.file_type ?? "";
      let fileSize = note?.file_size ?? 0;

      if (file) {
        // Remove old file when replacing
        if (isEdit && note?.file_url) {
          await supabase.storage.from(NOTES_BUCKET).remove([note.file_url]);
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        filePath = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from(NOTES_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (upErr) throw upErr;
        fileName = file.name;
        fileType = file.type;
        fileSize = file.size;
        // ensure ext used for future preview
        void ext;
      }

      const payload = {
        student_id: user.id,
        subject_id: values.subject_id,
        title: values.title.trim(),
        description: values.description?.trim() || null,
        file_name: fileName,
        file_url: filePath,
        file_size: fileSize,
        file_type: fileType,
      };

      if (isEdit && note) {
        const { error } = await supabase.from("notes").update(payload).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: notesKeys.all(user.id) });
      toast.success(isEdit ? "Note updated" : "Note uploaded");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Upload failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "Upload Note"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No subjects available. Add subjects first.
                        </div>
                      ) : (
                        subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.subject_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Note title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                File {isEdit ? "(optional — replaces existing)" : "*"}
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <UploadCloud className="h-5 w-5" />
                <span className="truncate">
                  {file
                    ? `${file.name} — ${formatBytes(file.size)}`
                    : isEdit
                      ? `Current: ${note?.file_name}`
                      : "PDF, DOCX, PPT or image (max 20 MB)"}
                </span>
                <input
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {fileError && (
                <p className="mt-1.5 text-xs text-destructive">{fileError}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !!fileError}
                className="bg-gradient-primary shadow-elegant hover:opacity-95"
              >
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Upload note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
