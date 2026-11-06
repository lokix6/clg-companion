import type { Database } from "@/integrations/supabase/types";

export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];

export const MAX_NOTE_SIZE = 20 * 1024 * 1024; // 20 MB
export const NOTES_BUCKET = "student-notes";

export const ACCEPTED_FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
};

export const ACCEPT_ATTR = Object.keys(ACCEPTED_FILE_TYPES).join(",");

export type FileCategory = "pdf" | "doc" | "ppt" | "image" | "other";

export function categorize(fileType: string): FileCategory {
  if (fileType === "application/pdf") return "pdf";
  if (fileType.startsWith("image/")) return "image";
  if (fileType.includes("word")) return "doc";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "ppt";
  return "other";
}

export function readableType(fileType: string): string {
  return ACCEPTED_FILE_TYPES[fileType] ?? fileType.split("/").pop()?.toUpperCase() ?? "FILE";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
