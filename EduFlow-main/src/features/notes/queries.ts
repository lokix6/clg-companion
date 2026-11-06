import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Note } from "./types";
import { NOTES_BUCKET } from "./types";

export const notesKeys = {
  all: (uid: string) => ["notes", uid] as const,
};

export const notesQuery = (uid: string | undefined) =>
  queryOptions({
    queryKey: uid ? notesKeys.all(uid) : ["notes", "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function createSignedNoteUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(NOTES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** file_url stores the storage path (uid/filename). Convert to signed URL on demand. */
export async function getNoteDownloadUrl(
  storagePath: string,
  download = false,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(NOTES_BUCKET)
    .createSignedUrl(storagePath, 3600, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
